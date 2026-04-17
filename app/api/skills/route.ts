import { NextRequest, NextResponse } from "next/server";
import { getAllSkills } from "@/lib/skills";
import { Category } from "@/lib/types";

const PER_PAGE = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("per_page") || String(PER_PAGE)))
  );
  const category = searchParams.get("category") as Category | null;
  const q = searchParams.get("q")?.toLowerCase() || "";

  let skills = getAllSkills();

  if (category) {
    skills = skills.filter((s) => s.category === category);
  }

  if (q) {
    skills = skills.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.title_zh.includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const total = skills.length;
  const paged = skills.slice((page - 1) * perPage, page * perPage);

  return NextResponse.json({ total, page, per_page: perPage, skills: paged });
}
