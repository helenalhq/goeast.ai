import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getOraclePrompt, ORACLE_DEEP_ADDENDUM } from "@/lib/oracle-prompts";
import { checkAndIncrementUsage, FREE_TIER_LIMIT, PRO_TIER_LIMIT } from "@/lib/rate-limit";
import { hasActiveProEntitlement } from "@/lib/creem";
import { createClient } from "@/lib/supabase/server";
import { validateIchingContext, buildIchingContextBlock, type IchingConsultationContext } from "@/lib/iching-context";

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
});

const VALID_SLUGS = [
  "prologue-zhougong",
  "ch01-laozi", "ch02-confucius", "ch03-sunzi", "ch04-zhuangzi",
  "ch05-mencius", "ch06-mozi", "ch07-zhuxi", "ch08-zhangzai",
  "ch09-huineng", "ch10-wangyangming",
];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { philosopher, question, ichingContext } = body;

  if (!philosopher || !question || typeof question !== "string" || question.trim().length === 0) {
    return new Response(JSON.stringify({ error: "philosopher and question are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!VALID_SLUGS.includes(philosopher)) {
    return new Response(JSON.stringify({ error: "Invalid philosopher" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (question.length > 500) {
    return new Response(JSON.stringify({ error: "Question too long (max 500 characters)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const promptConfig = getOraclePrompt(philosopher);
  if (!promptConfig) {
    return new Response(JSON.stringify({ error: "Philosopher not available for consultation" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // I Ching cast context (Zhou Gong only). Numbers validated; names resolved server-side.
  let validatedIchingContext: IchingConsultationContext | null = null;
  // (explicit null is treated as absent — some clients null optional fields)
  if (ichingContext !== undefined && ichingContext !== null) {
    if (philosopher !== "prologue-zhougong") {
      return new Response(JSON.stringify({ error: "ichingContext is only supported for Zhou Gong" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    validatedIchingContext = validateIchingContext(ichingContext);
    if (!validatedIchingContext) {
      return new Response(JSON.stringify({ error: "Invalid I Ching context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Check authorization via Supabase session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Require login for all AI features
  if (!user) {
    return new Response(JSON.stringify({
      error: "Please log in to use AI features.",
      code: "LOGIN_REQUIRED",
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let isPaid = false;

  if (user) {
    if (await hasActiveProEntitlement(supabase, user.id)) {
      const { allowed, remaining, error } = await checkAndIncrementUsage(supabase, user.id, PRO_TIER_LIMIT);
      if (error) {
        return new Response(JSON.stringify({
          error: "Rate limit service unavailable",
          code: "SERVICE_ERROR",
        }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!allowed) {
        return new Response(JSON.stringify({
          error: "Daily consultation limit reached (10/day)",
          code: "LIMIT_REACHED",
          remaining: 0,
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      isPaid = true;
    }
  }

  // Free tier (logged-in but unsubscribed) — rate limit by userId
  const isDev = process.env.NODE_ENV === "development";

  if (!isPaid && !isDev) {
    const { allowed, remaining, error } = await checkAndIncrementUsage(supabase, user!.id, FREE_TIER_LIMIT);
    if (error) {
      return new Response(JSON.stringify({
        error: "Rate limit service unavailable",
        code: "SERVICE_ERROR",
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!allowed) {
      return new Response(JSON.stringify({
        error: "Daily free consultation limit reached",
        code: "LIMIT_REACHED",
        remaining: 0,
      }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const MODEL = process.env.AZURE_OPENAI_MODEL || "gpt-5.4-mini";

  const finalPrompt = getOraclePrompt(philosopher, { deep: isPaid });
  if (!finalPrompt) {
    return new Response(JSON.stringify({ error: "Philosopher not available for consultation" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const contextBlock = validatedIchingContext ? buildIchingContextBlock(validatedIchingContext) : "";
  // Prompt assembly order matters: base → cast context → deep addendum (Pro).
  // The context block's three-part structure must come BEFORE the deep
  // addendum so Pro's extra sections (GOING DEEPER, follow-up) are appended
  // after the standard answer instead of being overridden by it.
  // (`promptConfig` is the validated base config from the early 404 check.)
  const system =
    promptConfig.system + contextBlock + (isPaid ? ORACLE_DEEP_ADDENDUM : "");

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: question.trim() },
      ],
      max_completion_tokens: Math.round(finalPrompt.maxWords * 1.5),
      temperature: 0.8,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Oracle API error:", error);
    return new Response(JSON.stringify({ error: "The oracle could not be reached. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
