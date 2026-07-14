"use client";

import { useState } from "react";

interface EmailCaptureProps {
  /** Heading text shown above the input */
  title?: string;
  /** Subtext shown below the heading */
  subtitle?: string;
  /** CTA button text */
  buttonText?: string;
  /** Source identifier for analytics (e.g. "iching_result", "ziwei_chart", "insight_article") */
  source?: string;
  /** Visual variant: "card" for light backgrounds, "inline" for darker backgrounds */
  variant?: "card" | "inline";
  /** Lead magnet text — shown as a small incentive below the form */
  leadMagnet?: string;
}

type Status = "idle" | "loading" | "success" | "error";

export default function EmailCapture({
  title = "Get Weekly Chinese Culture Insights",
  subtitle = "Join 500+ readers exploring Chinese philosophy, I Ching, and practical life guides.",
  buttonText = "Subscribe",
  source = "website",
  variant = "card",
  leadMagnet = "Free bonus: China Travel Checklist PDF",
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.alreadySubscribed ? "You're already subscribed!" : "Subscribed! Check your inbox.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const isCard = variant === "card";

  return (
    <div
      className={
        isCard
          ? "rounded-xl border border-sand bg-cream/60 p-6 text-center"
          : "text-center py-4"
      }
    >
      <h3 className="font-serif text-lg font-bold text-ink mb-1">{title}</h3>
      <p className="text-sm text-warm mb-4 leading-relaxed">{subtitle}</p>

      {status === "success" ? (
        <div className="py-3">
          <div className="text-2xl mb-2">&#10003;</div>
          <p className="text-sm text-ink font-medium">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="your@email.com"
            disabled={status === "loading"}
            className="flex-1 px-4 py-2.5 rounded-lg border border-sand bg-white text-sm text-ink placeholder:text-warm/50 focus:outline-none focus:border-china-red/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-5 py-2.5 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {status === "loading" ? "Subscribing..." : buttonText}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="text-xs text-red-600 mt-2">{message}</p>
      )}

      {status !== "success" && leadMagnet && (
        <p className="text-xs text-warm/60 mt-3">{leadMagnet}</p>
      )}
    </div>
  );
}
