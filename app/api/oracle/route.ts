import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOraclePrompt } from "@/lib/oracle-prompts";
import { checkFreeLimit, checkPaidRateLimit } from "@/lib/rate-limit";
import { getSubscriptionStatus } from "@/lib/creem";

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
    return NextResponse.json({ error: "philosopher and question are required" }, { status: 400 });
  }

  if (!VALID_SLUGS.includes(philosopher)) {
    return NextResponse.json({ error: "Invalid philosopher" }, { status: 400 });
  }

  if (question.length > 500) {
    return NextResponse.json({ error: "Question too long (max 500 characters)" }, { status: 400 });
  }

  const promptConfig = getOraclePrompt(philosopher);
  if (!promptConfig) {
    return NextResponse.json({ error: "Philosopher not available for consultation" }, { status: 404 });
  }

  // Check authorization — paid or free
  const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
  let isPaid = false;

  if (authToken) {
    const status = getSubscriptionStatus(authToken);
    if (status === "active") {
      if (!checkPaidRateLimit(authToken)) {
        return NextResponse.json({ error: "Please wait 30 seconds between consultations" }, { status: 429 });
      }
      isPaid = true;
    }
  }

  if (!isPaid) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ua = request.headers.get("user-agent") || "";
    const lang = request.headers.get("accept-language") || "";
    const { allowed } = checkFreeLimit(ip, ua, lang);

    if (!allowed) {
      return NextResponse.json({
        error: "Daily free consultation limit reached",
        code: "LIMIT_REACHED",
        remaining: 0,
      }, { status: 429 });
    }
  }

  const MODEL = process.env.AZURE_OPENAI_MODEL || "gpt-5.4-mini";

// Call OpenAI
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: promptConfig.system },
        { role: "user", content: question.trim() },
      ],
      max_completion_tokens: Math.round(promptConfig.maxWords * 1.5),
      temperature: 0.8,
    });

    const reading = completion.choices[0]?.message?.content || "The oracle is silent. Please try again.";

    return NextResponse.json({
      reading,
      philosopher,
      model: MODEL,
    });
  } catch (error) {
    console.error("Oracle API error:", error);
    return NextResponse.json({ error: "The oracle could not be reached. Please try again." }, { status: 500 });
  }
}
