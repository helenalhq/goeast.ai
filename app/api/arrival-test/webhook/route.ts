import { NextResponse } from "next/server";
import { acceptArrivalWebhook,previewEnabled,sendArrivalNotice } from "@/lib/arrival-preview-runtime";

export const runtime="nodejs";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"};
export async function POST(request:Request){
  if(!previewEnabled())return NextResponse.json({error:"not found"},{status:404,headers});
  try{
    const result=await acceptArrivalWebhook(await request.text(),request.headers.get("creem-signature")??"");
    const sent=result.queued ? await sendArrivalNotice(result.queued).catch(()=>false) : undefined;
    // Retry a genuine paid callback on notification failure. The committed job and
    // mail idempotency key survive the retry; also visible via the operator queue.
    return NextResponse.json({...result.body,notification:sent===undefined?undefined:sent?"sent":"pending"},{status:sent===false?503:result.status,headers});
  }catch{return NextResponse.json({error:"webhook unavailable"},{status:503,headers});}
}
