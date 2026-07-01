import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/webhooks/", "/api/checkout/", "/api/oracle/", "/account/"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
          "Bytespider",
          "CCBot",
        ],
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/account/", "/api/webhooks/", "/api/checkout/", "/api/oracle/"],
      },
    ],
    sitemap: "https://www.goeast.ai/sitemap.xml",
    host: "https://www.goeast.ai",
  };
}
