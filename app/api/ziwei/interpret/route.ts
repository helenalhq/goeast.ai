import { NextRequest } from "next/server";
import OpenAI from "openai";
import { astro } from "iztro";
import { getSystemPrompt, formatAstrolabeForPrompt } from "@/lib/ziwei-prompts";
import { checkFreeLimit, checkAuthUserRateLimit } from "@/lib/rate-limit";
import { getSubscriptionByUserId } from "@/lib/creem";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { birthDate, birthHour, gender, language } = body;

  // Validate inputs
  if (!birthDate || birthHour === undefined || !gender) {
    return new Response(
      JSON.stringify({ error: "birthDate, birthHour, and gender are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate birthDate format (YYYY-MM-DD)
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(birthDate)) {
    return new Response(
      JSON.stringify({ error: "birthDate must be in YYYY-MM-DD format" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate birthHour (0-11)
  const hour = Number(birthHour);
  if (isNaN(hour) || hour < 0 || hour > 11) {
    return new Response(
      JSON.stringify({ error: "birthHour must be between 0 and 11" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate gender
  if (gender !== "male" && gender !== "female") {
    return new Response(
      JSON.stringify({ error: "gender must be 'male' or 'female'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate language
  const lang = language || "both";
  if (!["en", "zh", "both"].includes(lang)) {
    return new Response(
      JSON.stringify({ error: "language must be 'en', 'zh', or 'both'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
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
    const subscription = await getSubscriptionByUserId(supabase, user.id);
    if (subscription?.status === "active" || subscription?.status === "scheduled_cancel") {
      const { allowed } = checkAuthUserRateLimit(user.id);
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

  // Free tier rate limiting — by userId (cannot be bypassed via VPN)
  const isDev = process.env.NODE_ENV === "development";

  if (!isPaid && !isDev) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ua = request.headers.get("user-agent") || "";
    const langHeader = request.headers.get("accept-language") || "";
    const { allowed } = checkFreeLimit(ip, ua, langHeader, user.id);

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

  // Generate astrolabe using iztro
  const genderZh = gender === "male" ? "男" : "女";
  let astrolabe;
  try {
    astrolabe = astro.bySolar(birthDate, hour, genderZh, true, "zh-CN");
  } catch (err) {
    console.error("iztro calculation error:", err);
    return new Response(
      JSON.stringify({ error: "Could not calculate chart for the given birth data. Please verify the date." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Serialize astrolabe data for prompt
  const astrolabeJson = JSON.parse(JSON.stringify(astrolabe));
  const systemPrompt = getSystemPrompt(lang);
  const userMessage = formatAstrolabeForPrompt(astrolabeJson, {
    birthDate,
    birthHour: hour,
    gender,
    language: lang,
  });

  const MODEL = process.env.AZURE_OPENAI_MODEL || "gpt-5.4-mini";

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_completion_tokens: 3000,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // First, send the astrolabe data so the client can render the chart
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "chart", data: astrolabeJson })}\n\n`)
          );

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`));
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
    console.error("Ziwei interpret API error:", error);
    return new Response(
      JSON.stringify({ error: "The astrologer could not be reached. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
