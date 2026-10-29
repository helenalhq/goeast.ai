"use client";

import { useEffect } from "react";
import { logEvent } from "@/lib/analytics";

/** Fire consult_entry_viewed once on mount — no question text, just the view. */
export default function EntryViewTracker() {
  useEffect(() => {
    logEvent("consult_entry_viewed");
  }, []);
  return null;
}
