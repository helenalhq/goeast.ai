import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const CREEM_API_KEY = process.env.CREEM_API_KEY || "";
const CREEM_API_BASE = process.env.CREEM_API_BASE || "https://api.creem.io";

export async function POST() {
  if (!CREEM_API_KEY) {
    return NextResponse.json(
      { error: "Payment not configured" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("creem_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "scheduled_cancel")
    .limit(1)
    .maybeSingle();

  if (!sub?.creem_subscription_id) {
    return NextResponse.json(
      { error: "No scheduled cancellation found" },
      { status: 404 },
    );
  }

  try {
    const res = await fetch(
      `${CREEM_API_BASE}/v1/subscriptions/${sub.creem_subscription_id}/resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CREEM_API_KEY,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Creem resume error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to resume subscription" },
        { status: 502 },
      );
    }

    // Use service role to update (bypasses RLS)
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const result = await admin
      .from("subscriptions")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("creem_subscription_id", sub.creem_subscription_id);

    if (result.error) {
      console.error("[resume] update error:", result.error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Creem resume error:", err);
    return NextResponse.json(
      { error: "Payment service unavailable" },
      { status: 502 },
    );
  }
}
