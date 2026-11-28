// Test-only, synthetic records in memory. Never import this as a payment or production order adapter.
export type Scenario = "t2" | "t1" | "day" | "unknown" | "ambiguous";
export type Phase = "sample" | "requested" | "paid" | "hold" | "review" | "approved" | "delivered" | "canceled";
export type Order = { scenario: Scenario; phase: Phase; revision: number };
export type Event = "apply" | "paid" | "wrongPayment" | "prepare" | "approve" | "delivered" | "changed" | "canceled";

export const sample = (scenario: Scenario): Order => ({ scenario, phase: "sample", revision: 1 });

export const sources = {
  taxis: "https://english.shanghai.gov.cn/en-Individuals-Transportation-PublicTransport/20260813/7366238930024ac8b22e5adf82217bd8.html",
  desk: "https://english.shanghai.gov.cn/en-FAQsAll/20261117/dfbbf9f600e444af887e6996ba434daf.html",
  rail: "https://english.shanghai.gov.cn/en-Transportation/20241231/f66f14bbd4b549ab88e6f3aec375790c.html",
  hotel: "https://www.hyatt.com/grand-hyatt/zh-CN/shagh-grand-hyatt-shanghai/hotel-info",
} as const;

export function getPlan(order: Order) {
  if (order.scenario === "unknown" || order.scenario === "ambiguous") return null;
  const t1 = order.scenario === "t1";
  const day = order.scenario === "day";
  const flight = (day ? "13:10" : "23:35") + (t1 ? " · PVG T1" : " · PVG T2");
  return {
    flight,
    route: "Use the official taxi stand outside Arrival Gate " + (t1 ? "12." : "25."),
    before: day ? "Save the hotel card offline and prepare a backup way to pay." : "Ask the hotel to confirm it will hold your room after midnight. Save the card offline and carry a backup way to pay.",
    fallback: "Ask the 24-hour International Services Shanghai desk near the international arrivals exit for help. Confirm how to pay before getting in the taxi.",
    rail: day ? null : "The Airport Link's regular last departure from Pudong is 22:15. Do not rely on it for this arrival.",
    address: "上海金茂君悦大酒店 · 上海市浦东新区世纪大道88号金茂大厦",
  };
}

export function advance(order: Order, event: Event): Order {
  const set = (phase: Phase): Order => ({ ...order, phase });
  if (order.phase === "delivered" || order.phase === "canceled") return order;
  if (event === "canceled" && order.phase !== "sample") return set("canceled");
  if (event === "apply" && order.phase === "sample") return set("requested");
  if (event === "paid" && order.phase === "requested") return set("paid");
  if (event === "prepare" && order.phase === "paid") return set(getPlan(order) ? "review" : "hold");
  if (event === "approve" && order.phase === "review") return set("approved");
  if (event === "delivered" && order.phase === "approved") return set("delivered");
  if (event === "changed" && ["paid","review","approved","hold"].includes(order.phase))
    return { ...order, revision: order.revision + 1, phase: "paid" };
  return order;
}
