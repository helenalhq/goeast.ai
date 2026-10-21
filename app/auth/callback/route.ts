import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Keep the validated return target through the failure path so a retry
  // (e.g. from pricing) doesn't lose the destination.
  return NextResponse.redirect(
    `${origin}/login?error=auth&next=${encodeURIComponent(next)}`
  );
}
