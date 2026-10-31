"use client";

import { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeNextPath } from "@/lib/auth-redirect";
import { logEvent } from "@/lib/analytics";
import { useRouter, useSearchParams } from "next/navigation";

type AuthMode = "login" | "signup" | "email-otp";
type OtpStep = "enter-email" | "enter-code";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get("next"));
  const authError = searchParams.get("error") === "auth";

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("enter-email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  // Start cooldown countdown when set
  const startCooldown = useCallback((seconds: number) => {
    setResendCooldown(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setMessage("");
    if (newMode !== "email-otp") {
      setOtpStep("enter-email");
      setOtpCode("");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        logEvent("login_succeeded", { return_target: next !== "/account" });
        router.push(next);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for a confirmation link.");
      }
    }

    setLoading(false);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Redirect after email link click (if user uses the link instead of the code)
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setOtpStep("enter-code");
      setMessage(`Verification code sent to ${email.trim()}. Check your inbox (and spam folder).`);
      startCooldown(60); // 60-second resend cooldown
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: "email",
    });

    if (error) {
      setError(
        error.message.includes("Invalid")
          ? "Invalid verification code. Please check and try again."
          : error.message.includes("expired")
            ? "Verification code has expired. Please request a new one."
            : error.message
      );
    } else {
      logEvent("login_succeeded", { return_target: next !== "/account" });
      router.push(next);
      router.refresh();
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1
          className="text-2xl font-bold text-ink text-center mb-2"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Sign in with Email"}
        </h1>
        <p className="text-warm text-sm text-center mb-8">
          {mode === "login"
            ? "Sign in to access your oracle consultations"
            : mode === "signup"
              ? "Join GoEast.ai — 3 free Oracle consultations every day"
              : "We&apos;ll send you a one-time verification code"}
        </p>

        {authError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-china-red/10 border border-china-red/20 text-china-red text-sm">
            Sign-in failed or the link expired. Please try again.
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-china-red/10 border border-china-red/20 text-china-red text-sm" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm" role="status">
            {message}
          </div>
        )}

        {/* Email OTP flow */}
        {mode === "email-otp" ? (
          <div className="space-y-4">
            {otpStep === "enter-email" ? (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-sand rounded-lg px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-china-red/40 transition-colors"
                  placeholder="you@example.com"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 mt-4 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-opacity cursor-pointer"
                  style={{ backgroundColor: "#c0392b" }}
                >
                  {loading ? "Sending…" : "Send Verification Code"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-ink mb-1">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full border border-sand rounded-lg px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-china-red/40 transition-colors text-center tracking-[0.3em] font-mono"
                    placeholder="000000"
                  />
                  <p className="text-xs text-warm/60 mt-1">
                    Enter the 6-digit code sent to {email}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || otpCode.trim().length < 6}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-opacity cursor-pointer"
                  style={{ backgroundColor: "#c0392b" }}
                >
                  {loading ? "Verifying…" : "Verify & Sign In"}
                </button>
                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("enter-email");
                      setOtpCode("");
                      setError("");
                      setMessage("");
                    }}
                    className="text-warm hover:text-china-red cursor-pointer"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-china-red hover:underline disabled:text-warm/40 disabled:no-underline cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Password / signup form */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-sand rounded-lg px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-china-red/40 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-sand rounded-lg px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-china-red/40 transition-colors"
                placeholder="Min 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-opacity cursor-pointer"
              style={{ backgroundColor: "#c0392b" }}
            >
              {loading
                ? "Loading…"
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-sand" />
          <span className="text-warm/50 text-xs">or</span>
          <div className="flex-1 h-px bg-sand" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-2.5 rounded-lg border border-sand text-ink text-sm font-medium hover:bg-sand/30 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Mode switch links */}
        <div className="text-center space-y-2 mt-6">
          {mode !== "email-otp" && (
            <p className="text-sm text-warm">
              <button
                onClick={() => switchMode("email-otp")}
                className="text-china-red hover:underline cursor-pointer"
              >
                Sign in with a one-time code instead
              </button>
            </p>
          )}
          {mode !== "login" && (
            <p className="text-sm text-warm">
              Already have an account?{" "}
              <button
                onClick={() => switchMode("login")}
                className="text-china-red hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
          {mode !== "signup" && (
            <p className="text-sm text-warm">
              {mode === "login" ? "Don't have an account? " : "Need a password account? "}
              <button
                onClick={() => switchMode("signup")}
                className="text-china-red hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-warm text-sm">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
