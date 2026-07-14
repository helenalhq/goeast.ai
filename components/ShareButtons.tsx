"use client";

import { useState } from "react";

interface ShareButtonsProps {
  /** The URL to share. If omitted, uses current page URL on client side. */
  url?: string;
  /** Pre-filled share text / title */
  title?: string;
  /** Visual label next to the buttons */
  label?: string;
}

export default function ShareButtons({
  url,
  title = "Check this out on GoEast.ai",
  label = "Share",
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    const finalUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: finalUrl });
      } catch {
        // User cancelled — no action needed
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    const finalUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = finalUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTwitter = () => {
    const finalUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const text = encodeURIComponent(title);
    const shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(finalUrl)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const buttonClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-warm/60">{label}:</span>

      {/* Twitter / X */}
      <button
        onClick={handleTwitter}
        className={`${buttonClass} bg-ink/5 text-ink hover:bg-ink/10 border border-sand`}
        aria-label="Share on Twitter/X"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Twitter
      </button>

      {/* Native share (mobile) / Copy link (desktop) */}
      <button
        onClick={handleNativeShare}
        className={`${buttonClass} bg-ink/5 text-ink hover:bg-ink/10 border border-sand`}
        aria-label="Share"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {copied ? "Copied!" : "Share"}
      </button>

      {copied && (
        <span className="text-xs text-green-600">Link copied to clipboard!</span>
      )}
    </div>
  );
}
