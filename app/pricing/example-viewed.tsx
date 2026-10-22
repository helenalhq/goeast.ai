"use client";

import { useEffect, useRef } from "react";
import { logEvent } from "@/lib/analytics";

/**
 * Fires `pricing_example_viewed` once when the Free-vs-Pro example section
 * enters the viewport (Intersection Observer). More accurate than mount-based
 * firing, which would count users who never scroll to the example.
 */
export default function ExampleViewed() {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.current) {
            fired.current = true;
            logEvent("pricing_example_viewed", {});
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 } // 30% visible = "viewed"
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} aria-hidden="true" />;
}
