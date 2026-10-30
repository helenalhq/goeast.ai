import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * List recent consultation results for the logged-in user.
 * Returns the 10 most recent sessions (sessionId, question, hexagram, timestamp).
 * RLS ensures only the owner's rows are visible.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("consult_results")
    .select("session_id, question, cast_data, created_at, next_step")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }

  return NextResponse.json({
    readings: (data || []).map((r) => ({
      sessionId: r.session_id,
      question: r.question,
      hexagramNumber: r.cast_data?.hexagramNumber,
      changingLines: r.cast_data?.changingLines || [],
      createdAt: r.created_at,
      hasNextStep: !!r.next_step,
    })),
  });
}
