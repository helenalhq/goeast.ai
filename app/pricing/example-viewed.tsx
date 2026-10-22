"use client";

import { useEffect, useRef } from "react";
import { logEvent } from "@/lib/analytics";

/**
 * Fires `pricing_example_viewed` once when the Free-vs-Pro example section
 * mounts. Mount-of-section is sufficient here (pricing is a single screen);
 * scroll-depth tracking is deliberately not used.
 */
export default function ExampleViewed() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    logEvent("pricing_example_viewed", {});
  }, []);
  return null;
}
