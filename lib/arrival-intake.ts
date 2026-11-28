// Preview-only fixtures. These identifiers, dates, hotels and eligibility outcomes are not live data.
export type Trip = { date: string; number: string; carrier: string; hotel: string };
type MatchedFlight = { date: string; number: string; time: string; departure: string; terminal: "T1" | "T2"; source: "airport" | "schedule" };
type FlightResult =
  | {kind: "matched"; flight: MatchedFlight}
  | {kind: "needs-carrier" | "unverified-terminal"; outsideWindow: boolean}
  | {kind: "outside-window" | "not-found" | "outside-scope" | "source-unavailable"};
export const DEMO_EMAIL = "traveler@example.test";
export const DEMO_EPOCH = "2026-11-28T09:00:00+08:00";
const trip = (date: string, number: string, hotel = "Bund Garden"): Trip => ({date, number, hotel, carrier: ""});
export const examples = {
  late: trip("2026-11-29", "DX246", "Bund Garden Riverside"),
  day: trip("2026-11-29", "DX138", "Jade House"),
  codeshare: trip("2026-12-05", "DX804"),
  uncertain: trip("2026-12-05", "DX905", "Jade House"),
  otherAirport: trip("2026-11-29", "DX417", "Jade House"),
  unavailable: trip("2026-11-29", "DX710", "Jade House"),
};
const plain = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const airportWindow = new Set(["2026-11-27", "2026-11-28", "2026-11-29"]);
export function lookupFlight({date, number, carrier}: Trip): FlightResult {
  const n = number.toUpperCase().replace(/\s/g, "");
  const outsideWindow = !airportWindow.has(date);
  const match = (time: string, terminal: MatchedFlight["terminal"], source: MatchedFlight["source"], actual = n): FlightResult =>
    ({kind: "matched", flight: {date, number: actual, time, terminal, source, departure: new Date(Date.parse(`${date}T${time}:00+08:00`) - 2 * 60 * 60_000).toISOString()}});
  if (n === "DX804" && date === "2026-12-05") {
    if (plain(carrier) === "demo pacific") return match("00:35", "T2", "schedule", "DP804");
    return {kind:"needs-carrier", outsideWindow};
  }
  if (n === "DX905" && date === "2026-12-05") return {kind:"unverified-terminal", outsideWindow};
  if (outsideWindow) return {kind: "outside-window"};
  if (date === "2026-11-28" || date === "2026-11-29") {
    if (n === "DX246") return match("23:35", "T2", "airport");
    if (n === "DX138") return match("13:10", "T1", "airport");
    if (n === "DX417") return {kind:"outside-scope"};
    if (n === "DX710") return {kind:"source-unavailable"};
  }
  return {kind:"not-found"};
}
const hotels = [
  {id:"riverside", name:"Bund Garden Riverside", address:"18 Example Road, Huangpu"},
  {id:"north", name:"Bund Garden North", address:"50 Sample Lane, Hongkou"},
  {id:"jade", name:"Jade House", address:"8 Demo Avenue, Jing’an"},
];
export function lookupHotels(name: string) {
  const key = plain(name);
  return key ? hotels.filter(hotel => plain(hotel.name).includes(key) || plain(hotel.address).includes(key)) : [];
}
export function readyForReview(flight: FlightResult, candidates: ReturnType<typeof lookupHotels>, id: string) {
  return flight.kind === "matched" && candidates.some(h => h.id === id);
}
export function formatShanghai(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone:"Asia/Shanghai", weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", hourCycle:"h23",
  }).format(new Date(iso));
}
export function makeDemoQuote(flight: MatchedFlight, email: string, openOrders = 0) {
  const start = Date.parse(DEMO_EPOCH), departure = Date.parse(flight.departure);
  const expires = start + 15 * 60_000;
  const latestDelivery = expires + 12 * 60 * 60_000;
  if (email !== DEMO_EMAIL || openOrders >= 2 || !Number.isFinite(departure) || departure - latestDelivery < 12 * 60 * 60_000) return null;
  return {price:"US$12.90", expires: formatShanghai(new Date(expires).toISOString()), latestDelivery:formatShanghai(new Date(latestDelivery).toISOString())};
}
