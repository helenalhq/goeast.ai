import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getOraclePrompt } from "@/lib/oracle-prompts";
import { checkFreeLimit, checkAuthUserRateLimit } from "@/lib/rate-limit";
import { getSubscriptionByUserId } from "@/lib/creem";
import { createClient } from "@/lib/supabase/server";

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
  const { philosopher, question } = body;

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

  // Check authorization via Supabase session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isPaid = false;

  if (user) {
    const subscription = await getSubscriptionByUserId(supabase, user.id);
    if (subscription?.status === "active" || subscription?.status === "scheduled_cancel") {
      const { allowed, remaining } = checkAuthUserRateLimit(user.id);
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

  // Free tier (anonymous or unsubscribed)
  const isDev = process.env.NODE_ENV === "development";

  if (!isPaid && !isDev) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ua = request.headers.get("user-agent") || "";
    const lang = request.headers.get("accept-language") || "";
    const { allowed } = checkFreeLimit(ip, ua, lang);

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

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: promptConfig.system },
        { role: "user", content: question.trim() },
      ],
      max_completion_tokens: Math.round(promptConfig.maxWords * 1.5),
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
