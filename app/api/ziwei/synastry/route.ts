import { NextRequest } from "next/server";
import OpenAI from "openai";
import { astro } from "iztro";
import { getSynastrySystemPrompt, formatSynastryForPrompt, RelationshipType } from "@/lib/ziwei-synastry";
import { checkFreeLimit, checkAuthUserRateLimit } from "@/lib/rate-limit";
import { getSubscriptionByUserId } from "@/lib/creem";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
});

const VALID_RELATIONSHIP_TYPES: RelationshipType[] = ["romantic", "business", "parent-child", "friendship"];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { personA, personB, relationshipType, language } = body;

  // Validate inputs
  if (!personA || !personB || !relationshipType) {
    return new Response(
      JSON.stringify({ error: "personA, personB, and relationshipType are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!VALID_RELATIONSHIP_TYPES.includes(relationshipType)) {
    return new Response(
      JSON.stringify({ error: "Invalid relationshipType" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate person A
  if (!personA.birthDate || personA.birthHour === undefined || !personA.gender) {
    return new Response(
      JSON.stringify({ error: "personA requires birthDate, birthHour, and gender" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate person B
  if (!personB.birthDate || personB.birthHour === undefined || !personB.gender) {
    return new Response(
      JSON.stringify({ error: "personB requires birthDate, birthHour, and gender" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate date formats
  const dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
  if (!dateRegex.test(personA.birthDate) || !dateRegex.test(personB.birthDate)) {
    return new Response(
      JSON.stringify({ error: "birthDate must be in YYYY-MM-DD format" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate hours
  const hourA = Number(personA.birthHour);
  const hourB = Number(personB.birthHour);
  if (isNaN(hourA) || hourA < 0 || hourA > 11 || isNaN(hourB) || hourB < 0 || hourB > 11) {
    return new Response(
      JSON.stringify({ error: "birthHour must be between 0 and 11" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate genders
  if (!["male", "female"].includes(personA.gender) || !["male", "female"].includes(personB.gender)) {
    return new Response(
      JSON.stringify({ error: "gender must be 'male' or 'female'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Language
  const lang = language || "both";
  if (!["en", "zh", "both"].includes(lang)) {
    return new Response(
      JSON.stringify({ error: "language must be 'en', 'zh', or 'both'" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check authorization
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Require login
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

  // Free tier rate limiting — by userId
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

  // Generate both astrolabes
  const genderAZh = personA.gender === "male" ? "男" : "女";
  const genderBZh = personB.gender === "male" ? "男" : "女";

  let astrolabeA, astrolabeB;
  try {
    astrolabeA = astro.bySolar(personA.birthDate, hourA, genderAZh, true, "zh-CN");
    astrolabeB = astro.bySolar(personB.birthDate, hourB, genderBZh, true, "zh-CN");
  } catch (err) {
    console.error("iztro synastry calculation error:", err);
    return new Response(
      JSON.stringify({ error: "Could not calculate charts. Please verify the birth data." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Serialize
  const astrolabeAJson = JSON.parse(JSON.stringify(astrolabeA));
  const astrolabeBJson = JSON.parse(JSON.stringify(astrolabeB));

  const systemPrompt = getSynastrySystemPrompt(lang);
  const userMessage = formatSynastryForPrompt(astrolabeAJson, astrolabeBJson, {
    personA: { birthDate: personA.birthDate, birthHour: hourA, gender: personA.gender },
    personB: { birthDate: personB.birthDate, birthHour: hourB, gender: personB.gender },
    relationshipType,
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
      max_completion_tokens: 4000,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send both charts for client rendering
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "charts", dataA: astrolabeAJson, dataB: astrolabeBJson })}\n\n`)
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
    console.error("Synastry API error:", error);
    return new Response(
      JSON.stringify({ error: "The astrologer could not be reached. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
