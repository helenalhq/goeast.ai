# GoEast.ai 内容矩阵 + 付费重定位设计

**日期**: 2026-06-13
**状态**: Draft → Approved
**核心问题**: 流量和注册极少，无法形成付费转化
**策略**: 先通过 SEO/内容营销建立流量基础，再通过增强的 Oracle Pro 实现付费转化

---

## 诊断

| 维度 | 现状 |
|---|---|
| 流量 | 极少 |
| 注册用户 | 极少 |
| 付费转化 | 零 |
| 核心用户 | 对中国文化/哲学感兴趣的全球英语用户 |
| 核心钩子 | Oracle 先知（和哲学家对话） |
| 获客策略 | SEO/内容营销（低成本，单人运营） |
| 付费产品 | Oracle Pro $4.99/月（Creem支付），10次/天 vs 免费1次/天 |
| SEO基础 | 已有扎实基础（structured data、llms.txt、OG images、sitemap） |

**关键洞察**: 问题不是付费模型不对，而是流量管道没有建立起来。先做内容获客，再做付费转化。

---

## 设计概述

构建一个从核心词到长尾词全覆盖的内容矩阵（约 115 个新页面），让 GoEast.ai 成为中国哲学英文内容在互联网上的权威站点。内容矩阵吸流 → Oracle 免费体验建立价值感 → Pro 增值功能实现付费转化。

**执行优先级**:
1. 哲学家深度页面（11 个哲学家 = 12 个新页面）
2. I Ching 交互指南 + 64 卦页面（65 个新页面）
3. 中国哲学词汇表（~20 个新页面）
4. 哲学主题短文（~15 个新页面）
5. Oracle 内容增强 + Pro 重新定位

---

## 模块 1: 哲学家深度页面 (Philosopher Deep Pages)

### 路由

```
/philosophers/            → 哲学家列表页
/philosophers/[slug]/     → 哲学家深度页（如 /philosophers/laozi/）
```

### 页面板块

| 板块 | 内容 | SEO 价值 |
|---|---|---|
| 生平概览 | 时间线形式的生平故事，关键事件、时代背景 | 匹配 "老子生平"、"Confucius biography" |
| 核心思想 | 3-5 个核心概念深度阐述（如道、无为、自然） | 匹配 "Laozi philosophy"、"Daoism key concepts" |
| 代表语录 | 5-8 条经典语录，中英双语，带出处和解读 | 匹配 "Laozi quotes"、"老子语录" |
| 现代影响 | 思想如何影响现代世界（商业、心理学、设计、AI） | 匹配 "Sunzi in modern business" 等长尾搜索 |
| Oracle CTA | "想和这位哲学家对话？试试 Oracle" | 转化入口 |
| 关联旅程 | 链接到对应的 Sophie's Journey 章节 | 内链 |

### 内容来源

- 从现有 `content/journeys/*.md` frontmatter 提取基础数据（哲学家名、时代、学派、语录、location）
- 创建新的 `content/philosophers/*.md` 文件，新增生平概览、核心思想、现代影响等长内容
- 所有内容英中双语

### 数据层

- `lib/types.ts` 新增 `Philosopher` 和 `PhilosopherDeep` 类型
- `lib/philosophers.ts` 新增数据读取函数（与 journeys.ts 同模式）
- 内容存放在 `content/philosophers/*.md`

### 哲学家列表（11 位）

| slug | 姓名 | 学派 |
|---|---|---|
| zhou-gong | 周公 | Ancient Civilization |
| laozi | 老子 | Daoism |
| confucius | 孔子 | Confucianism |
| sunzi | 孙子 | Strategy |
| zhuangzi | 庄子 | Daoism |
| mencius | 孟子 | Confucianism |
| mozi | 墨子 | Mohism |
| zhu-xi | 朱熹 | Neo-Confucianism |
| zhang-zai | 张载 | Neo-Confucianism |
| huineng | 慧能 | Zen Buddhism |
| wang-yangming | 王阳明 | School of Mind |

---

## 模块 2: I Ching 交互指南 (I Ching Interactive Guide)

### 路由

```
/iching/                  → I Ching 主页面（交互指南 + SEO 入口）
/iching/[hexagram]/       → 单卦详解页（如 /iching/qian/）
```

### 主页板块

| 板块 | 内容 | 作用 |
|---|---|---|
| I Ching 简介 | 什么是易经、历史起源、64 卦概览、阴阳概念 | SEO 入口内容 |
| 八卦交互图 | 8 个三爻卦的可视化交互图（乾☰、坤☷、震☳、巽☴、坎☵、离☲、艮☶、兑☱），点击显示含义 | 交互体验，增加停留时间 |
| 虚拟占卜（免费） | 简化的"三硬币法"模拟——用户点击6次投硬币，系统生成一个六爻卦，给出基本含义（卦名、象辞、简短解读） | 免费体验钩子 |
| Oracle Pro 深度解读 | Pro 用户获得 AI 增强的卦象解读——结合用户的问题，Oracle 用周公视角给出个性化解读 | 付费转化点 |
| 64 卦索引 | 所有 64 卦的列表，链接到各卦详解页 | 大量 SEO 页面入口 |

### 单卦页面内容

- 卦名（英中双语）
- 卦象图示
- 卦辞 + 爻辞（原文 + 英译 + 解读）
- 现代应用场景
- Oracle CTA："想获得针对你个人情况的解读？"

### 数据层

- `content/iching/` 目录存放 64 个卦的 Markdown 文件
- `lib/types.ts` 新增 `Hexagram` 类型
- `lib/iching.ts` 新增数据读取函数

### SEO 价值

64 个卦象页面 = 64 个独立 SEO 入口。I Ching 是英文互联网上中国哲学最热门的搜索话题之一。

---

## 模块 3: 中国哲学词汇表 + 哲学主题短文

### 3A: 词汇表 (Glossary)

```
/glossary/                → 词汇表总览页
/glossary/[concept]/      → 单个概念页（如 /glossary/dao/）
```

每个概念页面:
- 概念名称（英中双语）
- 2-3 段深度释义（哲学意义阐释，不只是字典定义）
- 所属学派（链接到对应哲学家深度页）
- 现代应用
- 相关概念（内链网络）
- Oracle CTA

核心概念列表（~20 个）:

| 英文 | 中文 | 学派 |
|---|---|---|
| Dao | 道 | Daoism |
| Wuwei | 无为 | Daoism |
| Ren | 仁 | Confucianism |
| Li | 理 | Neo-Confucianism |
| Qi | 气 | Various |
| Yin-Yang | 阴阳 | Universal |
| De | 德 | Daoism/Confucianism |
| Junzi | 君子 | Confucianism |
| Tian | 天 | Confucianism |
| Zhi | 智 | Confucianism |
| Fa | 法 | Legalism |
| Jian | 兼 | Mohism |
| Xin | 心 | School of Mind |
| Wu | 无 | Daoism |
| Pu | 朴 | Daoism |
| Zhongyong | 中庸 | Confucianism |
| Xing | 性 | Various |
| Ming | 命 | Confucianism |
| Ziran | 自然 | Daoism |
| Fengshui | 风水 | Universal |

### 数据层

- `content/glossary/*.md` 存放概念文件
- `lib/types.ts` 新增 `GlossaryEntry` 类型
- `lib/glossary.ts` 新增数据读取函数

### 3B: 哲学主题短文 (Insights)

```
/insights/                → 短文列表页
/insights/[slug]/         → 单篇短文
```

800-1200 字的深度短文，精准匹配长尾搜索词。

初始短文主题（~15 篇）:

1. "Sunzi's Art of War in the Age of AI"
2. "Wuwei: The Art of Not Trying in a Hustle Culture"
3. "Confucian Ethics and Modern Leadership"
4. "The Dao of Design: Minimalism Through Laozi's Lens"
5. "I Ching Decision-Making for Entrepreneurs"
6. "Zhuangzi's Butterfly Dream and Virtual Reality"
7. "Mencius on Human Nature: Are We Naturally Good?"
8. "Wang Yangming's Unity of Knowledge and Action"
9. "Mozi's Universal Love vs. Confucian Particularism"
10. "The Five Elements in Chinese Philosophy and Modern Systems Thinking"
11. "Qi: The Energy Concept That Bridges Medicine and Philosophy"
12. "Fengshui: Environmental Harmony or Superstition?"
13. "Zen Buddhism's Huineng and the Instant Enlightenment"
14. "Zhang Zai's Western Inscription: A Philosophy of Interconnectedness"
15. "Zhu Xi's Rationalism and Its Echoes in Modern Science"

每篇短文末尾有 Oracle CTA，内链到哲学家页和词汇页。

### 数据层

- `content/insights/*.md` 存放短文文件
- `lib/types.ts` 新增 `Insight` 类型
- `lib/insights.ts` 新增数据读取函数

---

## 模块 4: Oracle 内容增强 + Pro 重新定位

### Pro 功能重新定位

Oracle Pro 从"量更多"变为"质更深 + 体验更专属":

| 功能 | Free | Pro ($4.99/月) |
|---|---|---|
| Oracle 基础对话 | 3次/天（从1次提升） | 10次/天 |
| I Ching 虚拟占卜 | ✅ 免费（基础卦象含义） | ✅ 基础占卜 |
| I Ching AI 解读 | ❌ | ✅ Pro 独有（周公视角个性化解读） |
| 深度对话模式 | ❌ | ✅ Pro 独有（追问、对话历史保留） |
| 多哲学家联合对话 | ❌ | ✅ Pro 独有（如同时问老子和孔子） |
| 对话历史保存 | ❌ | ✅ Pro 独有 |
| 分享卡片 | ✅ 免费 | ✅ Pro（更精美样式） |

### Oracle 内容增强

1. **增强提示词**: 每个哲学家的 system prompt 增加更丰富的人格化内容——更有个性的回答、更多原典引用、更生动的比喻
2. **场景化对话**: 预定义常见场景（职业选择、人际关系、决策困境），用户可选场景 + 哲学家
3. **回答格式升级**: 结构化回答（核心洞见 + 原典引用 + 实践建议），更像"智慧顾问"

### 转化路径设计

每个内容页面都有自然转化路径:
1. 用户通过搜索进入内容页面
2. 内容底部有 Oracle CTA
3. 用户体验免费 Oracle → 感受到价值
4. 需要深度功能时 → 自然升级到 Pro

---

## SEO 内容矩阵总览

| 模块 | 新页面数 | 搜索词覆盖类型 |
|---|---|---|
| 哲学家深度页 | 12 | 核心词（哲学家名 + philosophy/biography/quotes） |
| I Ching | 65 | I Ching + divination + hexagram 名称 |
| 词汇表 | ~20 | 精确概念名搜索 |
| 短文 | ~15 | 长尾主题搜索 |
| **合计** | **~115 个新页面** | 从核心词到长尾词全覆盖 |

所有新页面都将:
- 包含 structured data (JsonLd)
- 包含动态 OG images
- 包含在 sitemap.xml 中
- 包含在 llms.txt 中
- 英中双语

---

## 执行优先级

1. **先**: 哲学家深度页面（12 个页面，核心 SEO 入口）
2. **次**: I Ching 交互指南 + 64 卦页面（65 个页面，最大 SEO 量）
3. **后**: 词汇表 + 短文（~35 个页面，长尾覆盖）
4. **最后**: Oracle 增强 + Pro 重新定位（等流量有基础后再打磨）

每个模块完成后验证 SEO 效果（Google Search Console 数据），再启动下一个模块。
