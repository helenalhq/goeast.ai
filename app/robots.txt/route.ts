import { NextResponse } from "next/server";

export async function GET() {
  const content = [
    "User-agent: *",
    "Allow: /",
    "",
    "# Disallow internal/sensitive routes",
    "Disallow: /api/webhooks/",
    "Disallow: /api/checkout/",
    "Disallow: /api/oracle/",
    "Disallow: /account/",
    "",
    "# AI Agent Resources",
    "# Machine-readable index: https://www.goeast.ai/llms.txt",
    "# Full content dump: https://www.goeast.ai/llms-full.txt",
    "# Structured API: https://www.goeast.ai/api/skills",
    "",
    "Sitemap: https://www.goeast.ai/sitemap.xml",
  ].join("\n");

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
