import  type { Response, Request, NextFunction} from "express"
import { verifyToken } from "@lib/auth";
export default async function Authenticate(req:Request,res:Response,next:NextFunction){
    try {
        const token = req.cookies.Authorization;
        if(!token){
            res.status(401).send({error:"missing token",message:"please send authorization cookie"})
        }

        const isTokenValid = await verifyToken(token);
        console.log("does token valid-",isTokenValid);
        if(!isTokenValid){
            return res.status(403).send({error:"no authentication",message:"cookie expired please relogin the site"});
        }
       next();
        
    } catch (error) {
     res.status(400).send({error:"exception",message:"exception occured while authenticating"});   
    }
}