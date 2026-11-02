import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Minimal private persistence for consultation results.
 * POST: save a result (upsert by session_id)
 * PATCH: partial update — nextStep (action text), actionStatus
 *        (not_started|in_progress|done), reviewNote (复盘心得 ≤1000).
 *        Only the fields present in the body are written, so editing one
 *        never silently clears another.
 * GET: retrieve a result by session_id
 * Ownership enforced by RLS + explicit user_id check; a PATCH matching zero
 * rows (someone else's report) is reported as 404, never a false success.
 */

const ACTION_STATUSES = new Set(["not_started", "in_progress", "done"]);
const REVIEW_NOTE_MAX = 1000;

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

  const body = await request.json().catch(() => ({}));
  const { sessionId } = body ?? {};
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // Partial update: only fields the client explicitly sent are written,
  // so editing the action never clears the status or the review note.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("nextStep" in body) {
    update.next_step = typeof body.nextStep === "string" ? body.nextStep.trim() : null;
  }
  if (body.actionStatus !== undefined) {
    if (!ACTION_STATUSES.has(body.actionStatus)) {
      return NextResponse.json(
        { error: "actionStatus must be one of not_started | in_progress | done" },
        { status: 400 },
      );
    }
    update.action_status = body.actionStatus;
  }
  if (body.reviewNote !== undefined) {
    if (body.reviewNote !== null && typeof body.reviewNote !== "string") {
      return NextResponse.json({ error: "reviewNote must be a string" }, { status: 400 });
    }
    const note = body.reviewNote === null ? "" : body.reviewNote.trim();
    if (note.length > REVIEW_NOTE_MAX) {
      return NextResponse.json({ error: `reviewNote too long (max ${REVIEW_NOTE_MAX})` }, { status: 400 });
    }
    update.review_note = note;
  }

  // .select() after update: zero returned rows means no owned row matched —
  // another user's report or a missing one. Never report a false success.
  const { data: updated, error } = await supabase
    .from("consult_results")
    .update(update)
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .select("session_id");

  if (error) {
    console.error("[consult/save] error:", error.message);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Reading not found." }, { status: 404 });
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
      actionStatus: data.action_status || undefined,
      reviewNote: data.review_note || undefined,
    },
  });
}
