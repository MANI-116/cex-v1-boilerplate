import express from "express";
import { prisma} from "@lib/prisma"
import * as payloadType  from "@defTypes/payloadTypes"
import * as bcrypt from "bcrypt"
import { createToken } from "@lib/auth"
import cookieParser from "cookie-parser";
import Authenticate from "./middleware/authenticate";
const app = express();
app.use(cookieParser());
app.use(express.json());

const BALANCES = {

}

const ORDERBOOKS = {
    SOL: {},
    BTC: {}
}

app.post("/signup", async(req, res) => {

    try {
        const payload =await payloadType.SignUpPayload.parseAsync(req.body);
        
        //get user details
        console.log(payload);
        const user = await prisma.user.findUnique({
            where:{username:payload.username},
            select:{id:true}
        })
        //check user already exists ot not
        console.log("user from db",user);
        if(user){
            return res.status(409).json({error:'conflict',message:"duplicate user found"})
        }
        //if not exits hash the password 
        const passwordHash = await bcrypt.hash(payload.password,10)
        console.log("password-",payload.password,"\n passwordHash:",passwordHash)
        //save to the db
        const newUser = { username:payload.username,passwordHash};
        const userId = await prisma.user.create({data:newUser,select:{id:true}});
        console.log("userid created-", userId);
        if(!userId){

            return res.status(500).json({error:"unable to signup",message:"error occured while saving the user"})
        }

        return res.status(201).send({data:"user created",message:"u can login now through your username now",userId})
        
    } catch (error:any) {

        console.log("error occured while signup-",error);
        if(error.name)
        res.status(400).send({error:"constraints failed",message:"please send correct payload",errlog:error} );
        
        console.log(error);
        res.status(500).send({error:"exception",message:"something went wrong"})
        
    }


})

app.post("/signin", async (req, res) => {

    try {
        //get the username and password 
        const payload = await payloadType.SignInPayload.parseAsync(req.body);
    
    
        //authenticate the user
    
        const userDetails = await prisma.user.findUnique({
            select:{id:true,passwordHash:true},
            where:{username:payload.username}
        })
        console.log(userDetails)
    
        if(!userDetails){
            return res.status(404).send({error:"norfound",message:"user does not exist"})
        }
    
        const doesPasswordMatch = await bcrypt.compare(payload.password,userDetails.passwordHash);
    
        if( !doesPasswordMatch){
            return res.status(401).send({"error":"authentication", message:"password does not match"})
        }
    
        console.log("password matched");
        //create a token
        const token = await createToken({userId:userDetails.id});
        console.log("token---",token);

        if(token.error){
            res.status(400).send({...token})
        }

        //send token
        res.status(201).cookie('Authorization',`${token.data}`).send({"message":"cookie has been set"})
        
        
    } catch (error:any) {
         console.log("error occured while signup-",error);
        if(error.name)
        res.status(400).send({error:"constraints failed",message:"please send correct payload",errlog:error} );
        
        console.log(error);
        res.status(500).send({error:"exception",message:"something went wrong"})
        
    }


})



/*
    body = {
        type:           "market" | "limit",
        price:          number | null,
        qty:            number,
        market_id:      string,
        side:           "buy" | "sell"
    }

    @returns {
        orderId: string,
        filledQty: number,
        averagePrice
    }
*/

// 50.01

// 500001
app.post("/order",Authenticate, (req, res) => {

    res.send("test successfull");

})
/*
    returns the status of an order (partially filled, success, cancellled)
    ALSO RETURNS THE INDIVIDUAL FILLS OF THIS ORDER 
*/
app.get("/order/:orderId",Authenticate,(req,res)=>{})
app.delete("/order/:orderId",Authenticate,(req,res)=>{})
app.get("/depth/:symbol",Authenticate,(req,res)=>{});
app.get("/orders",Authenticate,(req,res)=>{});
app.get("/fills",Authenticate,(req,res)=>{});

app.get("/balance/usd",Authenticate,(req,res)=>{});

/*  
    Returns the balance of all stocks
*/
app.get("/balance",Authenticate,(req,res)=>{})

app.listen(3000,()=>{
    console.log("server is running on the port 3000")
});