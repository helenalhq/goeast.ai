import { liveHistory } from "@/lib/decision-live-api";
import { decisionFault, decisionOwner, json, retryLater } from "@/lib/decision-store";

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === "production") return liveHistory(request);
  try {
    const access = await decisionOwner();
    if (access.response) return access.response;
    const { config, db, owner } = access;
    const rows = await db.history(owner, config.mode);
    if (rows.error) return retryLater();
    return json({ orders: rows.data.map(row => ({ id: row.id, status: row.status, createdAt: row.created_at })) });
  } catch {
    decisionFault("history_unavailable");
    return retryLater();
  }
}
