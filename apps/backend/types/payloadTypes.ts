import * as z from "zod"


export const Order = z.object({
    "assetId":z.string().min(3),
    "userId":z.string().min(3),
    "type":z.enum(["LIMIT","MARKET"]),
    "side":z.enum(["BUY","SELL"]),
    "price":z.string().regex(/^\d+$/, "Must be numeric"),
    "qty":z.string().regex(/^\d+$/, "Must be numeric")


})
export const SignUpPayload = z.object({
    username:z.string().min(4).max(30),
    password:z.string().min(8).max(40)
})

export const SignInPayload = z.object({
    username:z.string().min(4).max(30),
    password:z.string().min(8).max(40)
    
})

export const OrderPayload = z.object({
    type:z.enum(["LIMIT","MARKET"]),
    side:z.enum(["BUY","SELL"]),
    symbol:z.string(),
    price:z.bigint(),
    qty:z.bigint()
})
