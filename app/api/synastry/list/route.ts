import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * List recent synastry results for the logged-in user.
 * Returns the 10 most recent sessions. RLS ensures only the owner's
 * rows are visible.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("synastry_results")
    .select("session_id, relationship_type, person_a, person_b, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[synastry/list] error:", error.message);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }

  return NextResponse.json({
    readings: (data || []).map((r) => ({
      sessionId: r.session_id,
      relationshipType: r.relationship_type,
      personA: r.person_a,
      personB: r.person_b,
      createdAt: r.created_at,
    })),
  });
}
