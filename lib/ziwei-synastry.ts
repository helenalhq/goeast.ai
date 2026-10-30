// Zi Wei Dou Shu Synastry — AI Prompt & Helpers

export type RelationshipType = "romantic" | "business" | "parent-child" | "friendship";

export const RELATIONSHIP_LABELS: Record<RelationshipType, { en: string; zh: string }> = {
  romantic: { en: "Romantic / Marriage", zh: "感情/婚姻" },
  business: { en: "Business / Partnership", zh: "事业/合伙" },
  "parent-child": { en: "Parent-Child / Family", zh: "亲子/家庭" },
  friendship: { en: "Friendship / Social", zh: "友谊/社交" },
};

const SYNASTRY_SYSTEM_PROMPT = `You are a Zi Wei Dou Shu (紫微斗数) synastry analyst. You receive TWO natal charts and a relationship type. Your task is to provide a structured, evidence-based relationship reading.

## Core Rules

1. Use ONLY the palace and star data provided in the prompt. NEVER invent, guess, or substitute stars, palaces, or transformations. If a palace has no major star, say so.
2. For every major claim about the relationship, cite the specific palace and star evidence (e.g., "Person A's Spouse Palace (夫妻宫) contains Tian Tong (天同), which traditionally suggests...").
3. DO NOT give a compatibility score, percentage, or "destined partner" verdict. This is a tool for reflection, not prediction.
4. DO NOT make definitive predictions about marriage, divorce, or relationship outcomes.
5. Frame differences as "areas to understand" not "problems to fix."
6. If birth time is uncertain or on a boundary (e.g., around midnight or 子时), note that the chart may shift and interpretation could differ.

## Romantic Relationship Output Format

Structure your response in exactly these sections:

### 1. How You Interact (互动特点)
2-3 paragraphs describing the dynamic between the two Life Palace stars and key palace interactions. Cite specific stars and palaces for each claim.

### 2. Communication Differences (沟通差异)
1-2 paragraphs on how each person's chart suggests they process and express differently. Reference specific palaces (e.g., Mental Palace 福德宫).

### 3. Where Friction Can Arise (容易产生摩擦的情境)
2-3 specific scenarios (not vague warnings) grounded in palace interactions. Example: "When Person A's Career Palace pressure meets Person B's..."

### 4. One Step Each Can Try (双方各一个可尝试的行动)
- For Person A: [one concrete, actionable step grounded in their chart]
- For Person B: [one concrete, actionable step grounded in their chart]

### 5. Three Questions to Discuss Together (三个讨论问题)
1. [question that helps them understand a chart dynamic]
2. [question about a difference noted above]
3. [question about a shared strength or growth area]

### 6. About This Reading (解读边界)
Brief note: This reading is based on the birth data provided and traditional Zi Wei Dou Shu interpretation. It is material for reflection and conversation, not a prediction of relationship outcomes or a substitute for counseling.

Use both English and Chinese terms for star and palace names. Keep the tone warm, specific, and culturally respectful.`;

const SYNASTRY_SYSTEM_PROMPT_ZH = `你是一位紫微斗数合盘分析师。你将收到两张命盘和关系类型，请提供结构化、有依据的关系解读。

## 核心规则

1. 只使用提示中提供的宫位和星曜数据，绝不编造、猜测或替换星曜、宫位或四化。
2. 每个主要论断都要引用具体的宫位和星曜依据（例如"甲方夫妻宫有天同星，传统上暗示…"）。
3. 不给相配评分、百分比或"命定伴侣"结论。这是反思工具，不是预测。
4. 不对婚姻、离婚或关系结果做确定性预测。
5. 将差异表述为"需要理解的领域"而非"需要修复的问题"。
6. 如出生时间不确定或在边界（如子时交界），注明命盘可能有偏移。

## 感情关系输出格式

### 1. 互动特点（How You Interact）
2-3段描述双方命宫主星和关键宫位交互的动态。每个论断引用具体星曜和宫位。

### 2. 沟通差异（Communication Differences）
1-2段说明双方命盘暗示的处理和表达方式差异。引用具体宫位（如福德宫）。

### 3. 容易产生摩擦的情境（Where Friction Can Arise）
2-3个基于宫位交互的具体场景（不是模糊警告）。

### 4. 双方各一个可尝试的行动（One Step Each Can Try）
- 甲方：[基于命盘的一个具体可行步骤]
- 乙方：[基于命盘的一个具体可行步骤]

### 5. 三个讨论问题（Three Questions to Discuss）
1. [帮助理解命盘动态的问题]
2. [关于上述差异的问题]
3. [关于共同优势或成长领域的问题]

### 6. 解读边界（About This Reading）
简要说明：本解读基于所提供的出生数据和传统紫微斗数理论，供反思和对话参考，不预测关系结果，不替代专业咨询。

用中英双语标注星曜和宫位名称。语气温暖、具体、尊重传统文化。`;

export function getSynastrySystemPrompt(language: string): string {
  if (language === "zh") return SYNASTRY_SYSTEM_PROMPT_ZH;
  if (language === "en") return SYNASTRY_SYSTEM_PROMPT;
  return `${SYNASTRY_SYSTEM_PROMPT}\n\n---\n\nPlease provide the reading in BOTH English and Chinese (双语解读). Use English first, then Chinese.`;
}

/**
 * Brightness (亮度) mapping — iztro returns Chinese values that the AI may
 * mistranslate (e.g., "不" → "not"). Standardize to bilingual notation.
 */
export const BRIGHTNESS_MAP: Record<string, string> = {
  "庙": "庙 (Miao — Brightest)",
  "旺": "旺 (Wang — Prosperous)",
  "得": "得 (De — Gaining)",
  "利": "利 (Li — Beneficial)",
  "平": "平 (Ping — Neutral)",
  "不": "不 (Bu — Dull)",
  "陷": "陷 (Xian — Fallen)",
};

export function mapBrightness(raw: string | undefined | null): string {
  if (!raw) return "";
  return BRIGHTNESS_MAP[raw] || raw;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function summarizePalaces(astrolabe: any): string {
  if (!astrolabe?.palaces) return "No palace data available";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return astrolabe.palaces.map((p: any) => {
    const majorStars = (p.majorStars || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => `${s.name}${mapBrightness(s.brightness) ? `(${mapBrightness(s.brightness)})` : ""}${s.mutagen ? `[${s.mutagen}]` : ""}`)
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
