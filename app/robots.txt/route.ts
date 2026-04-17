import { NextResponse } from "next/server";

export async function GET() {
  const content = [
    "User-agent: *",
    "Allow: /",
    "",
    "Sitemap: https://goeast.ai/sitemap.xml",
    "",
    "# Agent resources",
    "# llms.txt: https://goeast.ai/llms.txt",
    "# JSON API: https://goeast.ai/api/skills",
  ].join("\n");

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
