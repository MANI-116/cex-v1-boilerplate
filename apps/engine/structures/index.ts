export class Order{

    filled:bigint = 0n;
    constructor(public orderId:string, public assetId:string,public qty:bigint,public price:bigint,public side:"BUY"|"SELL",public userId:string){

    }



}

export interface EngineRequest {
  correlationId: string;
  responseQueue: string;
  type:
    | "create_order"
    | "get_depth"
    | "get_user_balance"
    | "get_order"
    | "cancel_order";
  payload: Record<string, unknown>;
}

// interface EngineRequest {
//   correlationId: string;
//   responseQueue: string;
//   type:
//     | "create_order"
//     | "get_depth"
//     | "get_user_balance"
//     | "get_order"
//     | "cancel_order";
//   payload: Record<string, unknown>;
// }
export class AssetBalance{
  
    constructor(public qty:bigint,public lockedQty:bigint){

    }
    
}
export type Balance = {
    walletBalance:bigint,
    balanceAvailable:bigint,
    locked:bigint,
    assets:Map<string,AssetBalance>
}

export class OrderNode{
    public left:OrderNode | null = null;
    public right:OrderNode | null = null;
    public order:Order;
    constructor(order:Order){
        this.order= order;
    }   

}

export class OrderList{
    private head:OrderNode;
    private tail:OrderNode;
    private length:number=0;

    constructor(order:Order){
        let orderNode:OrderNode = new OrderNode(order);
        this.head = orderNode;
        this.tail = orderNode;
        this.length++;
    }
    getTopOrder(){
        return this.head.order;

    }
    getTotalLength(){
        return this.length;
    }
 
    append(orderNode:OrderNode){
        //empty list
        //there never be an emptyorder list at a pricelevel
        //we attach to tail

        orderNode.left = this.tail;
        this.tail.right = orderNode;
       this.tail = orderNode;
       this.length++;
       return; 


    }

    remove(orderNode:OrderNode):{isDeleted:boolean,error?:string}{

            //single node
            if( this.head === orderNode && this.tail === orderNode){
                return {isDeleted:false,error:"singleNode"}
            }
            //startnode
            if(this.head === orderNode ){
                if(orderNode.right === null ||this.length === 1 ) return {isDeleted:false,error:"singleNode"}
                
                let rn:OrderNode = orderNode.right;
                
                rn.left = null;
                orderNode.left = null;
                orderNode.right = null;
                this.head = rn;
                this.length--;
                return {isDeleted:true}
                
            }
            //endnode

            if( this.tail === orderNode && orderNode.left){
                let ln:OrderNode= orderNode.left;
                orderNode.left = null;
                ln.right = null;
                this.tail = ln;
                this.length--;
                return {isDeleted:true};

            }
            //middle node
            let ln = orderNode.left;
            let rn = orderNode.right;
            if(ln){
                ln.right = rn;
            }
            if(rn){
                rn.left = ln;
            }
            orderNode.left = null;
            orderNode.right = null;
            this.length--;
           return {isDeleted:true}
     

    }

    pop(){
      
            return this.remove(this.head)
        
       }
    top(){
        if(this.head){
            return this.head.order;
        }
    }
    topOrderNode(){
        return this.head;
    }    
}

export class OrderBook{
    public asks:Map<bigint,PriceLevelObject>
    public bids:Map<bigint,PriceLevelObject>
    constructor(private title:string){
        this.asks = new Map<bigint,PriceLevelObject>();
        this.bids = new Map<bigint,PriceLevelObject>();

    }
    addBidLevel(price:bigint,order:Order){
        const priceLevel = new PriceLevelObject(order)
        this.bids.set(price,priceLevel);
        return priceLevel;
    }
    addAskLevel(price:bigint,order:Order){
        const priceLevel = new PriceLevelObject(order);
        this.asks.set(price,priceLevel)
        return priceLevel;
    }
    removeBidLevel(price:bigint){
        const isDeleted = this.bids.delete(price);
        return isDeleted;

    }
    removeAskLevel(price:bigint){
        const isDeleted = this.asks.delete(price);

    }


}

export class PriceLevelObject{
    private totalQty:bigint = 0n;
    public orders:OrderList ;
    
    constructor(order:Order){
        this.orders = new OrderList(order);
    }
    addOrder(order:Order){
        let orderNode = new OrderNode(order);
        if(this.orders){
            this.orders.append(orderNode);
            this.totalQty += order.qty;
        }
        return orderNode;
    }

    /*
    when there is  a price level match ,matching engine fetch the orders one by one based on the required qty.
    we need to give top order ,so that it decides to modiy or delete after the completion of the fill
    --we need getTopOrder
    */
  
   getTopOrder(){
    if(this.orders)
    return this.orders.getTopOrder();
   }

   removeOrder(orderNode:OrderNode){
    if(this.orders)
    this.orders.remove(orderNode);

   }

}




export class BidTree{
    public topPrice:bigint =0n;
    private arr:bigint[]=[];

    getHighestBid(){
        let top = this.arr[this.arr.length-1]
        if(top)
        return top;
    return 0n;
    }
    popHighestBid(){
        const res = this.arr.pop();
        this.topPrice = this.getHighestBid();
        return res;
    }
    findInsertPlace(left:number,right:number,target:bigint):number{

        //no element

        if(left > right) return -1;
        //single element
        if(left === right && left < this.arr.length){
            if(target > this.arr[left]!){
                return left+1;
            }else if(target < this.arr[left]!){
                return left-1;

            }else{

                return left;
            }
        }

        //multiple elements
        let middle = left + ((right-left)/2);

        if(this.arr[middle] === target) return middle;
        if(this.arr[middle]! < target) return this.findInsertPlace(middle+1,right,target);
        
        return this.findInsertPlace(left,middle-1,target);

    }

    addPrice(price:bigint){
        if(this.arr.length== 0){
            this.arr.push(price);
        }
        //find the index
        let index = this.findInsertPlace(0,this.arr.length-1,price)
        if(index === -1) return null;
        //present bid is the highest bid
        if(index === this.arr.length){
            this.arr.push(price);
            this.topPrice = price;
            return;

        }
        if(this.arr[index] === price){
            return
        }
        
        this.arr.push(price);//to add new space
        //shift remaining elements to right starting from index

        for(let i = this.arr.length-2;i >= index;i--){
            this.arr[i+1]!= this.arr[i]!;
        }
        this.arr[index]=price;


    }

    findPrice(target:bigint):boolean{
        let index = this.findInsertPlace(0,this.arr.length-1,target);
        if(this.arr[index] === target) return true;
        return false;
    }

    deletePrice(target:bigint){
        const index = this.findInsertPlace(0,this.arr.length-1,target);
        if(index === -1) return;
        if(this.arr[index] != target) return;

        //every price after the index needs shift apostion left
        for(let i = index ; i<this.arr.length-1;i++){
            this.arr[i] = this.arr[i+1]!;
        }
        this.arr.pop();
        this.topPrice = this.getHighestBid();
        return;

    }

    


}
export class BidTrees{
    public map:Map<string,BidTree>;
    constructor(){
         this.map= new Map<string,BidTree>()
    }
    
}

export class AskTree{
    public topPrice:bigint =0n;
    private arr:bigint[]=[];

    getMinAsk(){
        let top = this.arr[this.arr.length-1]
        if(top)
        return top;
    return 0n;
    }
    popMinAsk(){
        const res = this.arr.pop();
        this.topPrice = this.getMinAsk();
        return res;
    }
    findInsertPlace(left:number,right:number,target:bigint):number{

        //no element

        if(left > right) return -1;
        //single element
        if(left === right && left < this.arr.length){
            if(target > this.arr[left]!){
                return left-1;
            }else if(target < this.arr[left]!){
                return left+1;

            }else{

                return left;
            }
        }

        //multiple elements
        let middle = left + ((right-left)/2);

        if(this.arr[middle] === target) return middle;
        if(this.arr[middle]! < target) return this.findInsertPlace(left,middle-1,target);
        
        return this.findInsertPlace(middle+1,right,target);

    }

    addPrice(price:bigint){
        if(this.arr.length== 0){
            this.arr.push(price);
        }
        //find the index
        let index = this.findInsertPlace(0,this.arr.length-1,price)
        if(index === -1) return null;
        //present ask is the minimum
        if(index === this.arr.length){
            this.arr.push(price);
            this.topPrice = price;
            return;

        }
        if(this.arr[index] === price){
            return
        }
        
        this.arr.push(price);//to add new space
        //shift remaining elements to right starting from index

        for(let i = this.arr.length-2;i >= index;i--){
            this.arr[i+1] = this.arr[i]!;
        }
        this.arr[index]=price;


    }

    findPrice(target:bigint):boolean{
        let index = this.findInsertPlace(0,this.arr.length-1,target);
        if(this.arr[index] === target) return true;
        return false;
    }

    deletePrice(target:bigint){
        const index = this.findInsertPlace(0,this.arr.length-1,target);
        if(index === -1) return;
        if(this.arr[index] != target) return;

        //every price after the index needs shift apostion left
        for(let i = index ; i<this.arr.length-1;i++){
            this.arr[i] = this.arr[i+1]!;
        }
        this.arr.pop();
        this.topPrice = this.getMinAsk();
        return;

    }
}


export class AskTrees{
    public map:Map<string,AskTree>;
    constructor(){
         this.map= new Map<string,AskTree>()
    }
    
}




