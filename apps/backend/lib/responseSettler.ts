import { createClient } from "redis"
const responseClient = createClient();
responseClient.on("error",(e)=>{console.log("error from the redis-",e)});
await responseClient.connect();
const responseMap = new Map<string,Function>();

export async function responseSettlerWorker(){
while(true){
    const response = await responseClient.brPop("response-queue",10);
    if(!response){
        console.log("no rs")
        continue;
    }
    const res = JSON.parse(response.element);
    const resolve = responseMap.get(res.correlationId);
    console.log("hii");
    if(resolve)
    resolve(res);


}
}

export async function workerInit(){
    await responseSettlerWorker();
}

export const untilGotResponse = (identifier:string)=>{

    

    return new Promise((resolve,reject)=>{
        responseMap.set(identifier,resolve);

    })
}