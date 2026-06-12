import { NextRequest, NextResponse } from "next/server";
import { getAllSkills, getSkillBySlug } from "@/lib/skills";
import { Category, CATEGORIES } from "@/lib/types";

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
  const full = searchParams.get("full") === "true";

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

  const enriched = paged.map((s) => {
    const catInfo = CATEGORIES.find((c) => c.id === s.category);
    const result: Record<string, unknown> = {
      ...s,
      category_name: catInfo?.name || s.category,
      category_name_zh: catInfo?.name_zh || "",
      url: `https://www.goeast.ai/skills/${s.slug}`,
    };
    if (full) {
      const fullSkill = getSkillBySlug(s.slug);
      if (fullSkill) {
        result.full_description = fullSkill.content;
      }
    }
    return result;
  });

  return NextResponse.json(
    { total, page, per_page: perPage, skills: enriched },
    {
      headers: {
        Link: '<https://www.goeast.ai/llms.txt>; rel="service-desc", <https://www.goeast.ai/llms-full.txt>; rel="alternate"',
      },
    }
  );
}
