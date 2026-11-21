import { decisionFault, decisionOwner, json, retryLater } from "@/lib/decision-store";

export async function GET() {
  try {
    const access = await decisionOwner();
    if (access.response) return access.response;
    const { config, db, owner } = access;
    const rows = await db.from("decision_orders").select("id,status,created_at")
      .eq("owner_id", owner).eq("mode", config.mode).order("created_at", { ascending: false }).limit(100);
    if (rows.error) return retryLater();
    return json({ orders: rows.data.map(row => ({ id: row.id, status: row.status, createdAt: row.created_at })) });
  } catch {
    decisionFault("history_unavailable");
    return retryLater();
  }
}
