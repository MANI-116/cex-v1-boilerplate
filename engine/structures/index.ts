export class Order{

    filled:number = 0;
    constructor(public orderId:string, public assetTitle:string,public qty:number,public price:BigInt,public side:"BUY"|"SELL"){

    }



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
    private head:OrderNode|null = null;
    private tail:OrderNode|null = null;


    getTopOrder(){
        if(this.head)
        return this.head.order;
        
        return null;

    }
    constructor(){

    }
    append(order:OrderNode){
        //empty list
        if( this.head == null && this.tail == null){
            this.head = order;
            this.tail = order;
            return;
        }

        //with some nodes
        //we attach to tail

        order.left = this.tail;
        if(this.tail)

        this.tail.right = order;
       this.tail = order;
       return; 


    }

    remove(order:OrderNode){
        //list empty
        if( this.head === null && this.tail === null){
            return;
        }

        //start

            //single node
            if( this.head == order && this.tail == order){
                this.head = null;
                this.tail = null;
                return;
            }
            //startnode
            if(this.head === order){
                let rn:OrderNode|null = order.right;
                if(rn){
                    rn.left = null;
                }
                order.left = null;
                this.head = rn;
                return;
                
            }
            //endnode

            if( this.tail === order){
                let ln:OrderNode|null = order.left;
                order.left = null;
                if(ln){

                    ln.right = null;
                }

                this.tail = ln;
                return;

            }
            //middle node
            let ln = order.left;
            let rn = order.right;
            if(ln){
                ln.right = rn;
            }
            if(rn){
                rn.left = ln;
            }
            order.left = null;
            order.right = null;
     

    }

    pop(){
        if(this.head){
            this.remove(this.head)
        }
       }
}

export class OrderBook{
    private asks:Map<number,PriceLevelObject>
    private bids:Map<number,PriceLevelObject>
    constructor(private title:string){
        this.asks = new Map<number,PriceLevelObject>();
        this.bids = new Map<number,PriceLevelObject>();

    }


}

export class PriceLevelObject{
    private totalQty:number = 0;
    private orders:OrderList|null = null;
    
    constructor(){
        this.orders = new OrderList();
    }
    addOrder(order:Order){
        let orderNode = new OrderNode(order);
        if(this.orders){
            this.orders.append(orderNode);
            this.totalQty += order.qty;
        }
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
        let index = this.findInsertPlace(0,this.arr.length,price)
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
        let index = this.findInsertPlace(0,this.arr.length,price)
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


export class AskTrees{
    public map:Map<string,AskTree>;
    constructor(){
         this.map= new Map<string,AskTree>()
    }
    
}


