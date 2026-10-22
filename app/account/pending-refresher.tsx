"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While a checkout confirmation is pending, poll-refresh the page so the
 *  webhook-activated subscription shows up without user action. Stops after
 *  ~3 minutes to avoid endless reloads. */
export default function PendingRefresher() {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > 3 * 60 * 1000) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
