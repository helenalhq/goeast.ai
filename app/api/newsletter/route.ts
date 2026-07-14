import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail.length > 255) {
      return NextResponse.json(
        { error: "Email address is too long." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("email, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed!",
          alreadySubscribed: true,
        });
      }

      // Reactivate if previously unsubscribed
      const { error: reactivateError } = await supabase
        .from("newsletter_subscribers")
        .update({ status: "active", unsubscribed_at: null, subscribed_at: new Date().toISOString() })
        .eq("email", normalizedEmail);

      if (reactivateError) {
        console.error("Newsletter reactivation error:", reactivateError);
        return NextResponse.json(
          { error: "Failed to subscribe. Please try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Welcome back!" });
    }

    // Try to link to an existing user account
    const { data: userData } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert({
        email: normalizedEmail,
        source: source || "website",
        user_id: userData?.id || null,
        status: "active",
      });

    if (insertError) {
      // If duplicate key race condition, treat as success
      if (insertError.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed!",
          alreadySubscribed: true,
        });
      }
      console.error("Newsletter insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscribed successfully! Check your inbox for a confirmation.",
    });
  } catch (error) {
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
