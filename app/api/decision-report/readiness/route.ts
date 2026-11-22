import { liveReadiness } from "@/lib/decision-live-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request:Request) {
  return liveReadiness(request);
}
