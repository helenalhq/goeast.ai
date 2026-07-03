// Zi Wei Dou Shu Synastry — AI Prompt & Helpers

export type RelationshipType = "romantic" | "business" | "parent-child" | "friendship";

export const RELATIONSHIP_LABELS: Record<RelationshipType, { en: string; zh: string }> = {
  romantic: { en: "Romantic / Marriage", zh: "感情/婚姻" },
  business: { en: "Business / Partnership", zh: "事业/合伙" },
  "parent-child": { en: "Parent-Child / Family", zh: "亲子/家庭" },
  friendship: { en: "Friendship / Social", zh: "友谊/社交" },
};

const SYNASTRY_SYSTEM_PROMPT = `You are a master Zi Wei Dou Shu (紫微斗数) synastry analyst with deep knowledge of traditional Chinese astrology and relationship compatibility analysis.

You will receive TWO natal charts (Person A and Person B) along with their relationship type. Your task is to provide a comprehensive compatibility reading.

## Analysis Framework

1. **命宫 (Life Palace) Comparison** — Compare the major stars in each person's Life Palace to assess personality compatibility
2. **夫妻宫 (Spouse Palace) Cross-Reference** — For romantic readings, analyze each person's Spouse Palace stars and how they relate to the other's Life Palace
3. **官禄宫 (Career Palace) Synergy** — For business partnerships, compare career palaces
4. **子女宫 (Children Palace) & 父母宫 (Parents Palace)** — For parent-child readings
5. **仆役宫 (Friends Palace)** — For friendship readings
6. **四化飞星 (Four Transformations)** — Identify mutual beneficial or conflicting transformations
7. **五行相生相克 (Five Elements)** — Analyze elemental harmony between the two charts

## Output Format

Structure your response with:
- Overall Compatibility Score (as a percentage with explanation)
- Key Strengths of This Pairing (3-5 points)
- Potential Challenges (2-3 points)
- Specific Advice for This Relationship Type
- Best Areas of Collaboration / Connection

Use both English and Chinese terms for star names and palace names.
Keep the tone warm, constructive, and culturally respectful.
Provide actionable modern-life advice alongside traditional interpretations.`;

const SYNASTRY_SYSTEM_PROMPT_ZH = `你是一位紫微斗数合盘大师，精通传统中国命理学的关系相配分析。

你将收到两张命盘（甲方和乙方）以及他们的关系类型。请提供全面的合盘解读。

## 分析框架

1. **命宫对比** — 比较双方命宫主星，评估性格相合度
2. **夫妻宫交叉** — 感情合盘时，分析各自夫妻宫星曜与对方命宫的关系
3. **官禄宫协同** — 事业合盘时，比较双方官禄宫
4. **子女宫与父母宫** — 亲子合盘时重点分析
5. **仆役宫** — 友谊合盘时重点分析
6. **四化飞星** — 找出互利或冲突的四化
7. **五行相生相克** — 分析两盘间的五行和谐度

## 输出格式

- 总体相配指数（百分比 + 说明）
- 这对组合的关键优势（3-5点）
- 潜在挑战（2-3点）
- 针对此关系类型的具体建议
- 最佳合作/连接领域

用中英双语标注星曜和宫位名称。
语气温暖、建设性，尊重传统文化。
在传统解读之外提供现代生活实用建议。`;

export function getSynastrySystemPrompt(language: string): string {
  if (language === "zh") return SYNASTRY_SYSTEM_PROMPT_ZH;
  if (language === "en") return SYNASTRY_SYSTEM_PROMPT;
  return `${SYNASTRY_SYSTEM_PROMPT}\n\n---\n\nPlease provide the reading in BOTH English and Chinese (双语解读). Use English first, then Chinese.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function summarizePalaces(astrolabe: any): string {
  if (!astrolabe?.palaces) return "No palace data available";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return astrolabe.palaces.map((p: any) => {
    const majorStars = (p.majorStars || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => `${s.name}${s.brightness ? `(${s.brightness})` : ""}${s.mutagen ? `[${s.mutagen}]` : ""}`)
      .join(", ");
    return `${p.name}(${p.heavenlyStem}${p.earthlyBranch}): ${majorStars || "无主星"}`;
  }).join("\n");
}

export function formatSynastryForPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  astrolabeA: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  astrolabeB: any,
  params: {
    personA: { birthDate: string; birthHour: number; gender: string };
    personB: { birthDate: string; birthHour: number; gender: string };
    relationshipType: RelationshipType;
    language: string;
  }
): string {
  const { personA, personB, relationshipType } = params;
  const relLabel = RELATIONSHIP_LABELS[relationshipType];

  return `## Synastry Reading Request
Relationship Type: ${relLabel.en} (${relLabel.zh})

### Person A — 甲方
- Birth: ${personA.birthDate}, Hour Index: ${personA.birthHour}, Gender: ${personA.gender}
- Five Elements Class: ${astrolabeA.fiveElementsClass || "N/A"}
- Soul Star (命主): ${astrolabeA.soul || "N/A"}
- Body Star (身主): ${astrolabeA.body || "N/A"}
- Zodiac: ${astrolabeA.zodiac || "N/A"}

#### Palaces (十二宫):
${summarizePalaces(astrolabeA)}

### Person B — 乙方
- Birth: ${personB.birthDate}, Hour Index: ${personB.birthHour}, Gender: ${personB.gender}
- Five Elements Class: ${astrolabeB.fiveElementsClass || "N/A"}
- Soul Star (命主): ${astrolabeB.soul || "N/A"}
- Body Star (身主): ${astrolabeB.body || "N/A"}
- Zodiac: ${astrolabeB.zodiac || "N/A"}

#### Palaces (十二宫):
${summarizePalaces(astrolabeB)}

Please provide a detailed synastry analysis for this ${relLabel.en} relationship.`;
}
