
import  { OrderBook, AskTree, BidTree,Order, OrderNode,AssetBalance  } from "./structures/index.ts"
import type { Balance, EngineRequest  } from "./structures/index.ts"
import { z }from "zod"
import { createClient} from "redis"
import { prisma } from "@repo/db"

const PayloadCreateOrder = z.object({
    "assetId":z.string().min(3),
    "userId":z.string().min(3),
    "type":z.enum(["limit","market"]),
    "side":z.enum(["buy","sell"]),
    "price":z.string().regex(/^\d+$/, "Must be numeric").transform((v)=>{return BigInt(v)}),
    "qty":z.string().regex(/^\d+$/, "Must be numeric").transform((v)=>{return BigInt(v)})


})
const askTrees = new Map<string,AskTree>()
const bidTrees = new Map<string,BidTree>()
const ordersRefMap = new Map<string,OrderNode>()

const reqClient =  createClient();
reqClient.on('error',(e)=>{console.log("error in redis-",e)});
await reqClient.connect();

const resClient = createClient();
resClient.on('event',(e)=>{console.log("error on publishing reposne-",e)});
await resClient.connect();
let orderBooks = new Map<string,OrderBook>();



const balances = new Map<string,Balance>()

//userId= 
//yser-2:
//assetId=5be2d42b-b2ed-482e-be41-ee00e5cfb098

const users = [{
    userId:"b3cd7735-fcd5-4f34-aadd-b1d1d5bc44e9",
    balances:{walletBalance:1000000000000n,balanceAvailable:9000000000000n,locked:0n},
    assets:{assetId:"5be2d42b-b2ed-482e-be41-ee00e5cfb098",qty:1500000n,locked:0n}
},
{
    userId:"a14a0b1d-5bda-4c73-917b-99dc603589fc",
    balances:{walletBalance:2000000000000n,balanceAvailable:90000000000n,locked:0n},
    assets:{assetId:"5be2d42b-b2ed-482e-be41-ee00e5cfb098",qty:15555555000000n,locked:0n}
}]


users.forEach((user)=>{
    const assetBalance = new AssetBalance(user.assets.qty,user.assets.locked);
    const abalances = new Map<string,AssetBalance>();
    abalances.set(user.assets.assetId,assetBalance);
    const balance = {...user.balances,assets:abalances}
    balances.set(user.userId,balance)

})

users.forEach((u)=>{console.log("consoling user balance for user",balances.get(u.userId))})

const CreateOrderSchema = z.object({
    type:z.enum(["LIMIT","MARKET"]),
    side:z.enum(["BUY","SELL"]),
    userId:z.string().min(1),
    assetId:z.string().min(1),
    qty:z.string().regex(/^\d+$/).transform((v)=>BigInt(v)),
    price:z.string().regex(/^\d+$/,"must be numeric").transform(v=>BigInt(v))

})

async function placeOrderInOrderBook(assetId:string,type:"bids"|"asks",order:Order){
    const price = order.price;

    
    //checking pricelevel exists
    let assetOrderBook = orderBooks.get(assetId);
    if( assetOrderBook === undefined){
        //create orderbook for the asset
        console.log("creating order book")
        orderBooks.set(assetId,new OrderBook(assetId));
        assetOrderBook = orderBooks.get(assetId);
    }

    if(type === "bids"){
        const assetBids = assetOrderBook!.bids;
        let priceLevelObject = assetBids.get(price);
        
        if(priceLevelObject === undefined){
            //create price level object and also insert the price to bidtree
            let bidTree = bidTrees.get(assetId);
            if(bidTree === undefined){
                //create a bidTree and add priceLevel
                bidTrees.set(assetId,new BidTree());
                bidTree  = bidTrees.get(assetId);

            }
            bidTree!.addPrice(price);
            priceLevelObject = assetOrderBook?.addBidLevel(price,order);
         
           ordersRefMap.set(order.orderId, priceLevelObject!.orders!.topOrderNode());
           return;
            
        }
        //add object to price level and add refernce
        const orderNode = priceLevelObject!.addOrder(order);
        ordersRefMap.set(order.orderId, orderNode);
        return;
        

    }else{
        //this section for asks

        const assetAsks = assetOrderBook!.asks;
        let priceLevelObject = assetAsks.get(price);
        
        if(priceLevelObject === undefined){
            //create price level object and also insert the price to assetTree
            //creating price level;
            
            let askTree = askTrees.get(assetId);
            if(askTree === undefined){
                //create a askTree and add priceLevel
                console.log("creating asktree")
                askTrees.set(assetId,new AskTree());
                askTree  = askTrees.get(assetId);

            }
            askTree!.addPrice(price);
            priceLevelObject = assetOrderBook?.addAskLevel(price,order);
         
           ordersRefMap.set(order.orderId, priceLevelObject!.orders!.topOrderNode());
           return;
            
        }
        //add object to price level and add refernce
        const orderNode = priceLevelObject!.addOrder(order);
        ordersRefMap.set(order.orderId, orderNode);
        return;

    }
          
    
}
/*
 the function assumes already checked price levels matched 
 */

 type FillType = 'MAKER'|'TAKER';
 type OrderType = 'LIMIT'|'MARKET'
 type Side = 'BUY'|'SELL'

 async function transact(bidOrder:Order,askOrder:Order,qty:bigint,bidFill:FillType,askFill:FillType){

        const { assetId,price,userId}  = bidOrder
        const askerBalanceBook = balances.get(userId);
        const buyerBalanceBook = balances.get(userId);

        if(buyerBalanceBook === undefined || askerBalanceBook=== undefined){
            return {error:"critical", message:"askers or buyrs orderbook not present"};
        }
        
        const sellerAssetBalance = askerBalanceBook.assets.get(askOrder.assetId);
        
        if(sellerAssetBalance === undefined){
            return { error:"critical",message:"seller doesnot have locked Qty"}
        }
        const lockedQty = sellerAssetBalance.lockedQty;
    

        if(lockedQty < qty){
            console.log("locked qty is less then the transfer")
            return {error:"warn", message:"not enough qty from askOrder to transfer"}
        }
           
            
       //Transaction start
              //fill the bidder
          
             const bidFillId = await prisma.fill.create({
                data:{
                    userId:bidOrder.userId,
                    orderId:bidOrder.orderId,
                    type:bidFill,
                    qty:qty,
                    side:"BUY",
                    price,
                    assetId

                },
                select:{
                    id:true
                }
            })

            //fill the asker
            const askFillId  = await prisma.fill.create({
                data:{
                    userId:askOrder.userId,
                    orderId:askOrder.orderId,
                    type:askFill,
                    qty:qty,
                    side:"SELL",
                    price,
                    assetId
                },
                select:{
                    id:true
                }
            })

            //update orders of seller and buyer
            const buyUpdateResponse = await prisma.order.update({
                where:{
                    id:bidOrder.orderId
                },
                data:{
                    fillQty:bidOrder.filled + qty,
                    status:`${bidOrder.filled + qty === bidOrder.qty ? "FILLED" : "PARTIALLY_FILLED"}`
                }
            })

            console.log("buyer update response after fill",buyUpdateResponse)

           

            //update orders of seller
            const updateSellerOrder = await prisma.order.update({
                where:{
                    id:askOrder.orderId
                },
                data:{
                    fillQty:askOrder.filled+qty,
                    status:`${askOrder.filled + qty === askOrder.qty ? "FILLED" : "PARTIALLY_FILLED"}`
                }
            })

            console.log("asker update response after fiull",updateSellerOrder)

            //reduce  askers qty and increase balance and free locked qty    
            sellerAssetBalance.lockedQty -= qty;
            askerBalanceBook.walletBalance += qty * price;
            

            //increase bidder qty and reduce balance and free locked balance ;
            buyerBalanceBook.locked -= qty * price;
            let buyerAsset = buyerBalanceBook.assets.get(assetId);
            
            if(buyerAsset === undefined){
                buyerBalanceBook.assets.set(assetId,new AssetBalance(0n,0n));
                buyerAsset = buyerBalanceBook.assets.get(assetId);
                
            }

            buyerAsset!.qty += qty;


             //update buyer order filled
             //us
            bidOrder.filled += qty;

            //update askOrders filled
            askOrder.filled += qty

            //transaction ends
            return {message:"transaction went smooth",data:{qtyTransfered:qty}}

 }
async function executeOrder(order:Order){
  
    if(order.side === "BUY"){
        
        console.log("buy order is in executing phase-----")
        const {side ,assetId,userId,qty,price} = order;
        const assetAsks = orderBooks.get(assetId)!.asks;
        const asksPriceLevel = assetAsks.get(price);
        
        if(asksPriceLevel === undefined){
            await placeOrderInOrderBook(assetId,"bids",order);
            return;
        }

        if(asksPriceLevel.orders === undefined){
            await placeOrderInOrderBook(assetId,"bids",order);
            return ;

        }
        while(order.filled < qty){
            const askFirstOrder = asksPriceLevel.orders.top();
            
            if(askFirstOrder === undefined) {
                console.log("orders are empty--placing in the orderbook")
                 await placeOrderInOrderBook(assetId,"bids",order);
                 return;
            }

            //transfer the the required qty
             let transferQty = ((askFirstOrder.qty-askFirstOrder.filled) > (qty-order.filled)) ? (qty-order.filled): (askFirstOrder.qty-askFirstOrder.filled);
             const response =  await  transact(order,askFirstOrder,transferQty,"TAKER","MAKER");
             if(response.error){
                return { error:"erroron transaction",message:response};
             }
        
            //remove the asks order and its reference if filled
            if(askFirstOrder.filled === askFirstOrder.qty){   
               
                const res = asksPriceLevel.orders.pop();
                 console.log("removing order-",res.isDeleted);
                if(!res.isDeleted && asksPriceLevel.orders.getTotalLength() === 1){
                    //we need to remove the level as it is the final node;
                  
                     ordersRefMap.delete(askFirstOrder.orderId);
                     //remove the price level in asks:
                     assetAsks.delete(price);
                     const askTree = askTrees.get(assetId);
                     if(askTree){
                        askTree.deletePrice(price);
                     }
            
                    return;
                }
                 ordersRefMap.delete(askFirstOrder.orderId);
            
            }

            if(order.qty === order.filled) return;
            
        }
    }else{

        // this section is for asks matching
        const {assetId,qty,price} = order;
        const assetBids = orderBooks.get(assetId)!.bids;
        const bidsPriceLevel = assetBids.get(price);
        if(bidsPriceLevel === undefined){
            await placeOrderInOrderBook(assetId,"asks",order);
            return;
        }

        if(bidsPriceLevel.orders === undefined){
             await placeOrderInOrderBook(assetId,"asks",order);
             return;

        }
        while(order.filled < qty){
            const bidFirstOrder = bidsPriceLevel.orders.top();
            
            if(bidFirstOrder === undefined) {
                 await placeOrderInOrderBook(assetId,"asks",order);
                 return;
            }

               let transferQty = ((qty-order.filled) > (bidFirstOrder.qty-bidFirstOrder.filled))? (bidFirstOrder.qty-bidFirstOrder.filled):(qty-order.filled); 
             const response =  await  transact(bidFirstOrder,order,transferQty,"MAKER","TAKER");
             if(response.error){
                console.log("response from transact---",response);

                return;
             }
        
            //remove the asks order and its reference if filled
            if(bidFirstOrder.filled === bidFirstOrder.qty){   
            
               const response =  bidsPriceLevel.orders.pop();
               if(!response.isDeleted && bidsPriceLevel.orders.getTotalLength() === 1){
                assetBids.delete(price);

                const bidTree = bidTrees.get(assetId)
                if(bidTree){
                    bidTree.deletePrice(price);
                }
               }
                ordersRefMap.delete(bidFirstOrder.orderId);
            }

            if(order.qty === order.filled) return;
            
        }

    }


}


async function createLimitAskOrder(userId:string,qty:bigint,price:bigint,type:OrderType="LIMIT",side:Side="BUY",assetId:string){
    console.log("create limit order function invoked");

    try {
        //check wether user have asset or net --->yes lock it --> no return error response
        const sellerBalance = balances.get(userId);
        if(sellerBalance === undefined) { return { error:"critical", message:"no balance account registered under seller"}};
        const sellerAssets = sellerBalance.assets;
        if(sellerAssets === undefined) return {error:"criticial",message:"user does not have any assets"};
        const sellerAsset = sellerAssets.get(assetId);
        if(sellerAsset === undefined) return {error:"critical",message:"no asset found "};
    
        //locking the qty of the user if availble is present in the account
        const quantityAvailable =sellerAsset.qty - sellerAsset.lockedQty;
        if(quantityAvailable < qty) return { error:"critical", message:"user does not have qty to sell,please resize order"};
    
        sellerAsset.lockedQty += qty;
    
        //creating the order
        const {id} = await prisma.order.create({
            data:{userId,qty,price,type,side,assetId},
            select:{id:true}
        })
        const orderId = id;
        console.log("response after creating order-->",id);
    
        const sellerOrder:Order = new Order(
            orderId,
            assetId,
            qty,
            price,
            side,
            userId);
    
        //now check if matching bid is available if yes execute the order else place it in the order book;
        const assetBidTree = bidTrees.get(assetId);
        if(assetBidTree === undefined){
            //place order and return;
            console.log("creating assetOrderBook from asks")
            await placeOrderInOrderBook(assetId,"asks",sellerOrder)
            return {filled:0n};
        } 
        const maxBid = assetBidTree.getHighestBid();
        if(maxBid <= sellerOrder.price){
            //execute the order and return
            await executeOrder(sellerOrder);
            return {filled:sellerOrder.filled};
        }else{
            //place it on the order books and return
            return { filled:0n}
        }
        
    } catch (error) {
        console.log(error, "error on the crate limit order");
        return { error:"unrecognized", message:error}
        
    }
    

}
async function createLimitBuyOrder(userId:string,qty:bigint,price:bigint,FillType="LIMIT",side:Side="BUY",assetId:string){
    //check wether user have balance or not -->if yes lock it else send response iwtht no balance
                console.log("create by order invoked")
                try{

                    const buyerBalance = balances.get(userId);
                    if(buyerBalance === undefined) { return { error:"critical", message:"user balance account not defined"}};
                    const requiredBalance = qty*price;
                    const availableBalance = buyerBalance.balanceAvailable ;
                    if( availableBalance >= requiredBalance){
                        //lock the amount in user account
                        
                        buyerBalance.locked += requiredBalance;
                        buyerBalance.balanceAvailable -= requiredBalance;
    
                    }else{
                        return { error:"critical",message:"no account balance found"}
                    }
    
                    //create order
                    const response = await prisma.order.create({ data:{
                        userId,
                        type:"LIMIT",
                        assetId,
                        qty,
                        price,
                        side
                    },
                    select:{
                    id:true
                    }
                    })
    
                    const {id} = response;
                    const orderId = id;
                    console.log("response after creating order-",response);
                    console.log("got the oid-",orderId);
                    const order:Order = new Order( orderId,assetId,qty,price,"BUY", userId )
    
                
    
                    //matching order
    
                    //got the min ask and then if min_ask<= buy_price execute the fills else put in the orderbook
                    let assetOrderBook= orderBooks.get(assetId);
                    if(assetOrderBook === undefined) {
                        //create asset orderbook ==> there no asks fr the asset so we can return with 0 filled;
                        console.log("creating assetOrderBook for asset from bids")
                        await placeOrderInOrderBook(assetId,"bids",order)
                        return { filled:order.filled};
    
                    };
                
    
                    //get the best ask:
                    const assetAskTree = askTrees.get(assetId);
                    if(assetAskTree === undefined) {
                        //implies no asks for the asset yet
                        await placeOrderInOrderBook(assetId,"bids",order);
                        return { filled:order.filled};
                    }
                    const minAsk = assetAskTree.topPrice;
    
    
                    //martching with best ask
                    //matched
                    if(minAsk <= price){ 
                        await executeOrder(order);
                        return {filled:order.filled}
                    }
    
                    //not found the match place it in the book
                    await placeOrderInOrderBook(assetId,"bids",order);
                    return { filled : order.filled};

                }catch(e){
                    console.log("error on creating the buymimit order",e);
                    return { error:"critical", message:e}

                }    

}

async function matching_engine(req:EngineRequest){

    try {
        if( req.type === "create_order"){

        let {type,side,assetId,qty,price,userId} =  CreateOrderSchema.parse(req.payload);
        console.log(qty," -------",price)
        
        if(type==="LIMIT"){

            if(side === "BUY"){
                
               const response =  await createLimitBuyOrder(userId,qty,price,"LIMIT","BUY",assetId);
               console.log("response from createlimitbuyorder func engine", response);
               return response;
                
            }else{

                const response = await createLimitAskOrder(userId,qty,price,"LIMIT","SELL",assetId);
                console.log("response from the askCreateAskOrder",response);
                return response;

            }

        }else{
            console.log("not implemented market orders yets");
            return { error:"debug",message:"not implemented"}

        }

    }
    } catch (error) {

        console.log("error on matching engine",error);
        
    }

    

    return {error:"critical",message:"no matching engine type found"}
    
}

while(1){
    const req = await reqClient.brPop("insertQueue",5);
    console.log(req);
    if(req){
        const parserResponse:EngineRequest = JSON.parse(req.element);
        console.log(parserResponse)
        const res = await matching_engine(parserResponse);
        console.log("response from the matching engine-----",res);
        let filled:string="0";
        if(res.filled){
            filled = res.filled.toString()
        }
        resClient.lPush("response-queue",JSON.stringify({filled,correlationId:parserResponse.correlationId}));
    }


}