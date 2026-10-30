import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Private persistence for synastry results.
 * POST: save a result (upsert by session_id)
 * GET ?session_id=: retrieve a result
 * Ownership enforced by RLS + explicit user_id check.
 */

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, personA, personB, relationshipType, language, chartA, chartB, aiResponse } = body;

  if (!sessionId || !personA || !personB || !relationshipType || !chartA || !chartB || !aiResponse) {
    return NextResponse.json(
      { error: "sessionId, personA, personB, relationshipType, chartA, chartB, and aiResponse are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("synastry_results").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      person_a: personA,
      person_b: personB,
      relationship_type: relationshipType,
      language: language || "both",
      chart_a: chartA,
      chart_b: chartB,
      ai_response: aiResponse,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );

  if (error) {
    console.error("[synastry/save] error:", error.message);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("synastry_results")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[synastry/get] error:", error.message);
    return NextResponse.json({ error: "Failed to retrieve" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ result: null });
  }

  return NextResponse.json({
    result: {
      sessionId: data.session_id,
      personA: data.person_a,
      personB: data.person_b,
      relationshipType: data.relationship_type,
      language: data.language,
      chartA: data.chart_a,
      chartB: data.chart_b,
      aiResponse: data.ai_response,
      completedAt: data.created_at,
    },
  });
}
