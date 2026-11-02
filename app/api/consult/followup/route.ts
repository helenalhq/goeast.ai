import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOraclePrompt } from "@/lib/oracle-prompts";
import { checkAndIncrementUsage, refundUsage, FREE_TIER_LIMIT, PRO_TIER_LIMIT } from "@/lib/rate-limit";
import { hasActiveProEntitlement } from "@/lib/creem";
import { createClient } from "@/lib/supabase/server";
import { validateIchingContext } from "@/lib/iching-context";
import {
  FOLLOWUP_TURN_LIMIT,
  FOLLOWUP_MAX_WORDS,
  validateFollowupQuestion,
  buildFollowupGrounding,
  type FollowupTurn,
} from "@/lib/consult-followup";

/**
 * Follow-up Q&A on a saved consultation (POST: ask, SSE; GET: list turns).
 * Everything the model sees is loaded here from the DB by session_id +
 * authenticated user — the client sends only sessionId, question text, and
 * an optional turnKey (client UUID) for retry idempotency. The original
 * report row is never written.
 */

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
});

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status });
}

/** Client-supplied turn keys must be UUIDs — they become row PKs. */
const TURN_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Row shape loadOwnedReport returns (dynamic select() defeats supabase's inference). */
type FollowupReportRow = {
  session_id: string;
  user_id: string;
  question: string;
  cast_data: unknown;
  ai_response: string;
};

/** Load the report only when it belongs to the caller (RLS + explicit check). */
async function loadOwnedReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string,
  select = "session_id, user_id, question, cast_data, ai_response",
): Promise<{ report: FollowupReportRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("consult_results")
    .select(select)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  return { report: (data as FollowupReportRow | null) ?? null, error: error ? error.message : null };
}

async function listTurns(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string, userId: string) {
  const { data, error } = await supabase
    .from("consult_followups")
    .select("id, question, answer, turn_index, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("turn_index", { ascending: true });
  if (error) return { error: error.message as string, turns: [] as FollowupTurn[] };
  return {
    error: null,
    turns: ((data || []) as Array<Record<string, unknown>>).map((t) => ({
      id: String(t.id),
      question: String(t.question),
      answer: String(t.answer),
      turnIndex: Number(t.turn_index),
      createdAt: String(t.created_at),
    })),
  };
}

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Please log in to use AI features.", code: "LOGIN_REQUIRED" }, 401);

  // 2. Input + report ownership
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return json({ error: "sessionId is required" }, 400);
  const question = validateFollowupQuestion(body?.question);
  if (!question) return json({ error: "Question is required (max 500 characters)" }, 400);

  // Optional idempotency key: retries of the SAME logical turn reuse it, so a
  // duplicate/concurrent/network-retried submission replays the saved answer
  // instead of generating (and charging) again. Absent → legacy behavior.
  const rawTurnKey = typeof body?.turnKey === "string" ? body.turnKey.trim().toLowerCase() : "";
  if (rawTurnKey && !TURN_KEY_RE.test(rawTurnKey)) {
    return json({ error: "turnKey must be a UUID" }, 400);
  }
  const turnKey = rawTurnKey || null;

  const { report, error: reportError } = await loadOwnedReport(supabase, sessionId, user.id);
  if (reportError) return json({ error: "Reading service unavailable", code: "SERVICE_ERROR" }, 503);
  if (!report) return json({ error: "Reading not found.", code: "NOT_FOUND" }, 404);

  // 3. Recorded cast must be valid — old/broken reports are excluded, not guessed
  const cast = validateIchingContext(report.cast_data);
  if (!cast) {
    return json(
      { error: "This reading has no usable cast data, so follow-ups are unavailable.", code: "REPORT_DATA_MISSING" },
      422,
    );
  }

  // 4. Idempotent replay — a saved turn with this key is streamed back as-is:
  // no charge, no model call, no new row. Retries at the 20-turn cap still
  // recover their answer (hence checked before the cap).
  if (turnKey) {
    const { data: existing } = await supabase
      .from("consult_followups")
      .select("id, session_id, question, answer")
      .eq("id", turnKey)
      .eq("user_id", user.id)
      .maybeSingle();
    const row = existing as { session_id: string; answer: string } | null;
    if (row) {
      if (row.session_id !== sessionId) {
        // Key reuse across reports is a client bug — reject, never leak.
        return json({ error: "turnKey already used for another reading.", code: "TURN_KEY_REUSED" }, 400);
      }
      const encoder = new TextEncoder();
      const replay = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ replay: true })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: row.answer })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(replay, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }
  }

  // 5. Turn cap (before charging)
  const { error: listError, turns } = await listTurns(supabase, sessionId, user.id);
  if (listError) return json({ error: "Follow-up history unavailable", code: "SERVICE_ERROR" }, 503);
  if (turns.length >= FOLLOWUP_TURN_LIMIT) {
    return json(
      { error: "Follow-up limit reached for this reading (20). Start a new consultation for a fresh cast.", code: "FOLLOWUP_LIMIT_REACHED" },
      429,
    );
  }
  // count+1 is advisory: concurrent tabs can share an index (soft cap by
  // design — no unique constraint; created_at disambiguates ordering).
  const turnIndex = turns.length + 1;

  // 6. Quota — same shared daily pool as the initial reading
  let chargedUserId: string | null = null;
  const isPaid = await hasActiveProEntitlement(supabase, user.id);
  const isDev = process.env.NODE_ENV === "development";
  if (isPaid || !isDev) {
    const { allowed, error } = await checkAndIncrementUsage(supabase, user.id, isPaid ? PRO_TIER_LIMIT : FREE_TIER_LIMIT);
    if (error) return json({ error: "Rate limit service unavailable", code: "SERVICE_ERROR" }, 503);
    if (!allowed) {
      return json(
        {
          error: "Daily consultation limit reached. Free accounts get 3 readings/day, Pro 10/day.",
          code: "LIMIT_REACHED",
          remaining: 0,
        },
        429,
      );
    }
    chargedUserId = user.id;
  }

  // 7. Generate, grounded in the DB record (conversational — no deep addendum)
  const promptConfig = getOraclePrompt("prologue-zhougong")!;
  const system =
    promptConfig.system +
    buildFollowupGrounding({
      originalQuestion: report.question,
      cast,
      originalReading: report.ai_response,
      turns,
    });

  let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    stream = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_MODEL || "gpt-5.4-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
      max_completion_tokens: Math.round(FOLLOWUP_MAX_WORDS * 1.5),
      temperature: 0.8,
      stream: true,
    });
  } catch (err) {
    if (chargedUserId) {
      const r = await refundUsage(chargedUserId);
      if (!r.refunded) console.warn("[followup] create-failure refund not applied:", r.reason);
    }
    console.error("Followup API error:", err);
    return json({ error: "The oracle could not be reached. Please try again." }, 500);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = "";
      let sawContent = false;
      let delivered = false;
      let clientGone = false;
      const safeEnqueue = (data: string) => {
        if (clientGone) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Client disconnected mid-stream — keep consuming the model so the
          // turn is still saved; a retry with the same turnKey replays it
          // for free instead of regenerating and recharging.
          clientGone = true;
        }
      };
      try {
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            sawContent = true;
            full += content;
            safeEnqueue(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
        if (!sawContent) {
          if (chargedUserId) {
            void refundUsage(chargedUserId).then((r) => {
              if (!r.refunded) console.warn("[followup] empty-stream refund not applied:", r.reason);
            });
          }
          safeEnqueue("data: [DONE]\n\n");
          controller.close();
          return;
        }
        delivered = true;
        // Persist the turn in this same request — append-only. With a turnKey
        // the client's UUID is the row id and ON CONFLICT DO NOTHING makes a
        // concurrent twin a detectable no-op instead of an error.
        if (turnKey) {
          const { data: inserted, error: upsertError } = await supabase
            .from("consult_followups")
            .upsert(
              { id: turnKey, session_id: sessionId, user_id: user.id, turn_index: turnIndex, question, answer: full },
              { onConflict: "id", ignoreDuplicates: true },
            )
            .select("id")
            .maybeSingle();
          if (upsertError) {
            console.error("[followup] upsert error:", upsertError.message);
            safeEnqueue(`data: ${JSON.stringify({ saveFailed: true })}\n\n`);
          } else if (!inserted) {
            // A concurrent twin with the same key won the insert: the turn IS
            // saved, so refund this attempt's charge — one logical turn, one
            // charge. The client's thread refetch shows the saved answer.
            if (chargedUserId) {
              void refundUsage(chargedUserId).then((r) => {
                if (!r.refunded) console.warn("[followup] conflict refund not applied:", r.reason);
              });
            }
            console.log("[followup] concurrent turnKey dedup: refunded duplicate attempt");
          }
        } else {
          const { error: insertError } = await supabase.from("consult_followups").insert({
            session_id: sessionId,
            user_id: user.id,
            turn_index: turnIndex,
            question,
            answer: full,
          });
          if (insertError) {
            console.error("[followup] insert error:", insertError.message);
            // Content already delivered — keep the charge, tell the client
            safeEnqueue(`data: ${JSON.stringify({ saveFailed: true })}\n\n`);
          }
        }
        safeEnqueue("data: [DONE]\n\n");
        controller.close();
      } catch (err) {
        if (chargedUserId && !delivered) {
          void refundUsage(chargedUserId).then((r) => {
            if (!r.refunded) console.warn("[followup] mid-stream refund not applied:", r.reason);
          });
        }
        safeEnqueue(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
        try {
          controller.close();
        } catch {
          // client gone
        }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Login required" }, 401);

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return json({ error: "session_id required" }, 400);

  const { report, error: reportError } = await loadOwnedReport(supabase, sessionId, user.id, "session_id");
  if (reportError) return json({ error: "Reading service unavailable" }, 503);
  if (!report) return json({ error: "Reading not found." }, 404);

  const { error, turns } = await listTurns(supabase, sessionId, user.id);
  if (error) return json({ error: "Failed to list follow-ups" }, 500);

  return NextResponse.json({
    followups: turns,
    count: turns.length,
    limitReached: turns.length >= FOLLOWUP_TURN_LIMIT,
  });
}
