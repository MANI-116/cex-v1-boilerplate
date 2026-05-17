import * as jwt from "jsonwebtoken"


const jwtSignPromise = (payload:{userId:string})=>{return new Promise((resolve,reject)=>{
    try {
        
        jwt.sign(payload,process.env.JWT_PASS!,{expiresIn:"1d"},(error,token)=>{
            if(error) reject(error);
            resolve(token);
        })
    } catch (error) {
        console.log(error);

    }
})}

const jwtVerifyPromse = (token:string)=>{return new Promise((resolve,reject)=>{
    try {
        
        jwt.verify(token,process.env.JWT_PASS!,(error,decoded)=>{
            if(error) reject(error);
            resolve(decoded);
        })
    } catch (error) {
        
    }
})}
export async function createToken(payload:{userId:string}){
    if(!process.env.JWT_PASS){
        return { error : "undefined" , message: "env undefined"}
    }
    
    try {    
           const token =  await jwtSignPromise(payload);
           return { data:token}
    } catch (error) {
        return { error:"error",message:"unable create token"}
        
    }


}

export async function verifyToken(token:string){
    try {
        const data =  await jwtVerifyPromse(token);
        console.log("verify token data",data);
        return {data}
    } catch (error) {
        return { error:true, message:error}
        
    }
}