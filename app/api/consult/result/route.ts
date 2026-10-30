import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Minimal private persistence for consultation results.
 * POST: save a result (upsert by session_id)
 * GET: retrieve a result by session_id
 * Ownership enforced by RLS + explicit user_id check.
 */

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, question, context, cast: castData, aiResponse } = body;

  if (!sessionId || !question || !castData || !aiResponse) {
    return NextResponse.json({ error: "sessionId, question, cast, and aiResponse are required" }, { status: 400 });
  }

  const { error } = await supabase.from("consult_results").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      question,
      context: context || {},
      cast_data: castData,
      ai_response: aiResponse,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );

  if (error) {
    console.error("[consult/save] error:", error.message);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, nextStep } = body;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("consult_results")
    .update({ next_step: nextStep ?? null, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
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
    .from("consult_results")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to retrieve" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ result: null });
  }

  return NextResponse.json({
    result: {
      sessionId: data.session_id,
      question: data.question,
      context: data.context,
      cast: data.cast_data,
      aiResponse: data.ai_response,
      completedAt: data.created_at,
      nextStep: data.next_step || undefined,
    },
  });
}
