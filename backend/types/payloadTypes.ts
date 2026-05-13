import * as z from "zod"

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
