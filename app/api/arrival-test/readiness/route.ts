import { NextResponse } from "next/server";
import { arrivalPreviewReady,previewEnabled } from "@/lib/arrival-preview-runtime";

export const runtime="nodejs";
export async function GET(){
  const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"};
  if (!previewEnabled()) return NextResponse.json({error:"not found"},{status:404,headers});
  const ready=await arrivalPreviewReady().catch(()=>false);
  // Boolean only; never disclose connection errors, row counts, or credentials.
  return NextResponse.json({ready},{status:ready?200:503,headers});
}
