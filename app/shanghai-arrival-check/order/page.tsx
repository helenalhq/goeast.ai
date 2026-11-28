import { notFound, redirect } from "next/navigation";
import { arrivalOrdersVisible } from "@/lib/arrival-orders-runtime";
import { createClient } from "@/lib/supabase/server";
import OrderForm from "./order-form";

export const dynamic="force-dynamic";
export const metadata={title:"Your Shanghai Arrival Check",robots:{index:false,follow:false}};
export default async function OrderPage({searchParams}:{searchParams:Promise<{id?:string}>}){
  if(!arrivalOrdersVisible()) notFound();
  const {id}=await searchParams;
  const validId=typeof id==="string"&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id)?id:"";
  const {data:{user}}=await (await createClient()).auth.getUser();
  if(!user) redirect("/login?next="+encodeURIComponent("/shanghai-arrival-check/order"+(validId?"?id="+validId:"")));
  if(process.env.VERCEL_ENV==="preview"&&user.id!==process.env.ARRIVAL_ORDERS_TEST_BUYER) notFound();
  return <main className="mx-auto max-w-2xl px-4 py-10 text-[#162d2f]">
    <p className="text-sm font-bold tracking-widest text-[#086457]">GOEAST · SHANGHAI ARRIVAL CHECK</p>
    <h1 className="mt-2 text-3xl font-bold">Your Shanghai arrival plan</h1>
    {process.env.VERCEL_ENV==="preview"&&<p className="mt-3 rounded bg-amber-50 p-3">Test only. Use entirely fictional trip details. No real charges or emails.</p>}
    <OrderForm id={validId}/>
  </main>;
}
