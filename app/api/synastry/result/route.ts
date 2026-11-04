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
      actionStatus: data.action_status || undefined,
      reviewNote: data.review_note || undefined,
    },
  });
}

const ACTION_STATUSES = new Set(["not_started", "in_progress", "done"]);
const REVIEW_NOTE_MAX = 1000;

/**
 * Partial update — actionStatus (user-set 未开始/进行中/已完成) and/or
 * reviewNote (复盘心得 ≤1000). Only fields present in the body are written,
 * so editing one never clears the other. Zero matched rows (someone else's
 * report) → 404, never a false success. Mirrors PATCH /api/consult/result.
 */
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

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
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

  const { data: updated, error } = await supabase
    .from("synastry_results")
    .update(update)
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .select("session_id");

  if (error) {
    console.error("[synastry/save] error:", error.message);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Reading not found." }, { status: 404 });
  }

  return NextResponse.json({ saved: true });
}
