import { NextResponse } from "next/server";
import { claimArrival,createArrivalCheckout,findPaidArrival,listClaimableArrivals,operator,previewEnabled,sendArrivalNotice } from "@/lib/arrival-preview-runtime";

export const runtime="nodejs";
const options={headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}};
export async function GET(request:Request){
  if (!previewEnabled()||!operator(request)) return NextResponse.json({error:"not found"},{...options,status:404});
  try {
    const id=new URL(request.url).searchParams.get("id");
    return NextResponse.json(id?await findPaidArrival(id):await listClaimableArrivals(),options);
  } catch {return NextResponse.json({error:"queue unavailable"},{...options,status:503});}
}
export async function POST(request:Request){
  if (!previewEnabled()||!operator(request)) return NextResponse.json({error:"not found"},{...options,status:404});
  try{
    const value=await request.json();
    if(typeof value?.claim==="string"){
      const claim=await claimArrival(value.claim,value.version);
      return NextResponse.json(claim??{error:"order unavailable or already claimed"},{...options,status:claim?200:409});
    }
    if(typeof value?.sendNoticeFor==="string") return NextResponse.json({sent:await sendArrivalNotice(value.sendNoticeFor)},options);
    if(![0,1].includes(value?.sample)) return NextResponse.json({error:"choose a QA sample"},{...options,status:400});
    return NextResponse.json(await createArrivalCheckout(value.sample),options);
  }catch{return NextResponse.json({error:"test checkout or notification unavailable"},{...options,status:503});}
}
