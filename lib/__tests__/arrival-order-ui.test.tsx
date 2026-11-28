// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import OrderForm from "../../app/shanghai-arrival-check/order/order-form";

const id="a3797201-764b-4fae-902e-0267d22cd96c";
const trip={date:"2026-12-09",flight:"DX118",hotel:"Park Hyatt Shanghai"};
const verified={hotel:trip.hotel,terminal:"T1",localTime:"13:10"};
const result=(state:string)=>Response.json({order:{id,state,trip,verified,subtotal:1290,currency:"USD",
  quote_expires:"2026-12-01T10:00:00Z",due_at:"2026-12-01T12:00:00Z",can_checkout:state==="quoted"}});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

it("requires explicit itinerary confirmation before starting checkout",async()=>{
  const fetcher=vi.fn(async (_url:string,opts?:RequestInit)=>opts?.method==="POST"
    ?Response.json({error:"Payment unavailable in this test"},{status:503}):result("quoted"));
  vi.stubGlobal("fetch",fetcher);
  render(<OrderForm id={id}/>);
  await screen.findByText("Park Hyatt Shanghai");
  const pay=screen.getByRole("button",{name:"Continue to checkout"}) as HTMLButtonElement;
  expect(pay.disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox",{name:/I confirm/}));
  expect(pay.disabled).toBe(false);
  fireEvent.click(pay);
  await screen.findByRole("alert");
  expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({id,acceptedQuote:true});
});

it("only renders both exact-order file links after the refreshed response is ready",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(result("paid")).mockResolvedValueOnce(result("ready"));
  vi.stubGlobal("fetch",fetcher);
  render(<OrderForm id={id}/>);
  await screen.findByText(/Payment confirmed/);
  expect(screen.queryByRole("link",{name:/download your pdf/i})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Refresh status"}));
  await waitFor(()=>expect(screen.getByRole("link",{name:/download your pdf/i}).getAttribute("href"))
    .toBe("/api/arrival-orders/orders?id="+id+"&file=pdf"));
  expect(screen.getByRole("link",{name:/save offline/i}).getAttribute("href")).toBe("/api/arrival-orders/orders?id="+id+"&file=png");
});
