import { ImageResponse } from "next/og";
import { getSkillBySlug, getSkillSlugs } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";

export const alt = "GoEast.ai Skill";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getSkillSlugs().map((slug) => ({ slug }));
}

export default async function SkillOG({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = getSkillBySlug(slug);
  if (!skill) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#faf5ef",
            fontSize: 32,
            color: "#8b7355",
          }}
        >
          GoEast.ai
        </div>
      ),
      { ...size }
    );
  }

  const categoryInfo = CATEGORIES.find((c) => c.id === skill.category);
  const categoryName = categoryInfo?.name || skill.category;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          backgroundColor: "#faf5ef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#c0392b",
              fontWeight: 600,
            }}
          >
            GoEast.ai
          </div>
          <div
            style={{
              fontSize: 14,
              backgroundColor: "#c0392b15",
              color: "#c0392b",
              padding: "4px 12px",
              borderRadius: 12,
            }}
          >
            {categoryName}
          </div>
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#2c1810",
            marginBottom: 12,
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {skill.title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#8b7355",
            marginBottom: 24,
          }}
        >
          AI Skills for China
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {skill.tags.slice(0, 5).map((tag: string) => (
            <div
              key={tag}
              style={{
                fontSize: 14,
                color: "#8b7355",
                backgroundColor: "#e0d5c5",
                padding: "4px 12px",
                borderRadius: 12,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
