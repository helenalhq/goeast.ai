import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CREEM_API_KEY = process.env.CREEM_API_KEY || "";
const CREEM_PRODUCT_ID = process.env.CREEM_PRODUCT_ID || "";

// Test mode uses a separate base URL
const CREEM_API_BASE = process.env.CREEM_API_BASE || "https://api.creem.io";

export async function POST(request: NextRequest) {
  if (!CREEM_API_KEY || !CREEM_PRODUCT_ID) {
    return NextResponse.json(
      { error: "Payment not configured" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  try {
    const res = await fetch(`${CREEM_API_BASE}/v1/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CREEM_API_KEY,
      },
      body: JSON.stringify({
        product_id: CREEM_PRODUCT_ID,
        success_url: `${baseUrl}/account`,
        customer: { email: user.email },
        metadata: { userId: user.id },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Creem checkout error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json({ checkoutUrl: data.checkout_url ?? data.url });
  } catch (err) {
    console.error("Creem checkout error:", err);
    return NextResponse.json(
      { error: "Payment service unavailable" },
      { status: 502 },
    );
  }
}
