# 「当代东方观象台」设计规格 V1

日期：2026-10-30 | 状态：待确认 | 分支：main @ 959c19b

---

## 一、代码盘点摘要

| 项 | 现状 | 复用方案 |
|---|---|---|
| 框架 | Next.js 16.2.4 / React 19.2.4 | 不动 |
| 样式 | Tailwind CSS 4 + `@tailwindcss/typography`；全局仅 24 行 CSS | 扩展 `tailwind.config.ts` 色板 |
| 字体 | `Noto Serif SC`（标题/衬线）+ `Noto Sans SC`（正文）+ `Inter`（拉丁）+ `JetBrains Mono`（卦象线条） | 全部保留；不新增中文字体 |
| 动效 | **无任何动画库**（无 framer-motion/gsap/three） | 纯 CSS transition/animation |
| 卦盘组件 | `ZiweiChart`（CSS Grid 12 宫）、`TrigramChart`、`IChingDivination`（客户端掷币） | 复用，仅换配色/间距 |
| 路由 | App Router；/consult、/ziwei/synastry、/iching 等已上线 | URL 不变 |
| 性能基线 | 首页 HTML 411KB（SSR 含全量内容）；/consult 30KB；/iching 170KB | CSS 增量预计 < 8KB（无新 JS） |

---

## 二、色彩规格

### 核心色板

| 令牌 | 值 | 用途 | 对比度 |
|---|---|---|---|
| `deep` | `#101923` | 首页 Hero / 探索区底色 | — |
| `panel` | `#192633` | 深底上的面板、卡片 | — |
| `panel-border` | `#253548` | 面板边框 | — |
| `light` | `#F2EDE4` | 深底上的主文字 | vs `#101923` = 13.2:1 ✅ |
| `light-muted` | `#A8B3BE` | 深底上的次要文字 | vs `#101923` = 7.1:1 ✅ |
| `paper` | `#F5F0E7` | 报告页/长文底色 | — |
| `paper-panel` | `#FFFFFF` | 纸面上的卡片 | — |
| `ink` | `#25313C` | 纸面上的主文字 | vs `#F5F0E7` = 10.8:1 ✅ |
| `ink-muted` | `#5C6B77` | 纸面上的次要文字 | vs `#F5F0F7` = 5.4:1 ✅ |
| `cinnabar` | `#B84938` | 主按钮、变爻标记、CTA | vs `#F5F0E7` = 4.8:1 ✅ |
| `cinnabar-hover` | `#A03D2E` | 按钮悬停 | — |
| `jade` | `#3D8B6E` | 辅助信息、对照标签 | vs `#F5F0E7` = 3.9:1（仅用于 ≥18px 或加粗） |
| `jade-text` | `#2D6B54` | 辅助文字（小字号用） | vs `#F5F0E7` = 5.2:1 ✅ |

### 保留色（现有组件）

| 令牌 | 值 | 用途 |
|---|---|---|
| `cream` | `#faf5ef` | 现有浅色页面底色（过渡期保留） |
| `sand` | `#e0d5c5` | 现有边框/分隔线 |
| `gold` | `#8e6d45` | 现有装饰色 |

### 使用规则

- 首页 Hero / 探索区用 `deep` 背景 + `light` 文字
- 咨询输入页 / 报告页用 `paper` 背景 + `ink` 文字
- **同一页面不混用深底和纸底**（避免模式切换跳跃感）
- `cinnabar` 仅用于可交互的主操作和变爻标记，不做大面积填充
- `jade` 仅用于辅助对照和标签，不与 `cinnabar` 同面积出现

---

## 三、字体规格

| 元素 | 字体 | 字号 | 行高 | 字重 |
|---|---|---|---|---|
| H1（页面标题） | Noto Serif SC | 32–40px | 1.3 | 700 |
| H2（区域标题） | Noto Serif SC | 24–28px | 1.4 | 600 |
| H3（小节标题） | Noto Serif SC | 18–20px | 1.4 | 600 |
| 正文 | Noto Sans SC / Inter | 16–18px | 1.7 | 400 |
| 表单标签 | Noto Sans SC | 14px | 1.4 | 500 |
| 卦象线条 | JetBrains Mono | 20–24px | — | 400 |
| 辅助说明 | Noto Sans SC | 13–14px | 1.5 | 400 |

- 长文宽度：680–760px（`max-w-[680px]` 到 `max-w-3xl`）
- 手机正文最小 16px；命盘/宫位表最小 13px 但需配合展开视图
- **不新增中文字体文件**——现有 Noto Serif SC / Noto Sans SC 已覆盖

---

## 四、间距与布局

| 令牌 | 值 | 用途 |
|---|---|---|
| `space-xs` | 4px | 图标与文字间距 |
| `space-sm` | 8px | 相关信息组内间距 |
| `space-md` | 16px | 卡片内间距 |
| `space-lg` | 24px | 卡片间间距 |
| `space-xl` | 48px | 区域间间距 |
| `space-2xl` | 80px | 页面大区间距 |

- 手机页面左右边距：16px（`px-4`）
- 桌面页面左右边距：32px（`px-8`）
- 最大内容宽度：`max-w-6xl`（1152px）；长文 `max-w-3xl`（768px）

---

## 五、动效规格

| 交互 | 时长 | 缓动 | 属性 |
|---|---|---|---|
| 按钮 hover | 120ms | `ease-out` | `background-color` |
| 按钮 active | 80ms | `ease-in` | `transform: scale(0.98)` |
| 面板展开/折叠 | 200ms | `ease-in-out` | `max-height` 或 `grid-template-rows` |
| 卡片 hover | 180ms | `ease-out` | `border-color` + `box-shadow` |
| 页面切换 | 不加（依赖浏览器默认） | — | — |
| 卦爻揭示 | 可跳过；仅 CSS `opacity` 淡入 150ms | `ease-out` | `opacity` |
| 焦点指示 | 0ms（即时） | — | `outline: 2px solid cinnabar` |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- 卦爻淡入在 reduced-motion 下直接显示
- 所有信息在无动画状态下完整可读

### 不使用

- ❌ 自动循环粒子
- ❌ 滚动劫持（scroll-jacking）
- ❌ 自动音效
- ❌ 整页 Canvas / WebGL
- ❌ 随机星盘装饰

---

## 六、三个界面区域设计

### A. 首页首屏

**布局（桌面 ≥768px）：**

```
┌─────────────────────────────────────────────────────┐
│ Header（deep 背景，light 文字）                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│   [东方观象台 OBSERVATORY]                           │
│   H1: Navigate life's questions                     │
│   with classical wisdom                             │
│                                                     │
│   I Ching consultation · Zi Wei astrology            │
│   · Relationship synastry                           │
│                                                     ││
│   [Begin a Free Consultation →]   ← cinnabar 按钮    │
│                                                     ││
│   Free · 3 readings/day · No coins needed            │
│                                                     ││
│         ┌─────────────────────┐                     ││
│         │ 示例卦象：恒卦 32      │                     ││
│         │ ━━━━━ ◦             │                     ││
│         │ ━━━━━               │  ← panel 卡片        │
│         │ ━ ━ ━ ━             │    标注 "示例"        ││
│         │ ━━━━━               │                     ││
│         │ ━ ━ ━ ━             │                     ││
│         │ ━ ━ ━ ━             │                     ││
│         └─────────────────────┘                     ││
│                                                     │
├─────────────────────────────────────────────────────┤
│ 三大工具卡片（panel 背景，light 文字）                   │
│ [I Ching] [Zi Wei Natal] [Synastry]                │
├─────────────────────────────────────────────────────┤
│ 知识导航（paper 背景）                                 │
│ 旅行指南 · 哲学 · 易经百科 · Skills                    │
└─────────────────────────────────────────────────────┘
```

**布局（手机 <768px）：**
```
┌───────────────────┐
│ Header (deep)     │
├───────────────────┤
│ 东方观象台          │
│ H1 (28px)         │
│ 副标题 (14px)      │
│                   │
│ [Begin Free →]    │  ← 首屏可见
│   cinnabar 按钮    │
│                   │
│ Free · 3/day      │
├───────────────────┤
│ ┌─ 示例卦象 ─┐     │  ← 第二屏
│ │ 恒卦 32    │     │
│ │ ━━━━━ ◦   │     │
│ │ ━━━━━     │     │
│ │ ━ ━ ━ ━   │     │
│ └───────────┘     │
├───────────────────┤
│ 三大工具（纵向）      │
├───────────────────┤
│ 知识导航            │
└───────────────────┘
```

**设计要点：**
- Hero 左文右图（桌面）；手机文上图下（按钮在首屏可见）
- 卦象卡片用 `panel` 色底 + `light` 文字 + 金色边框点缀
- 明确标注 "示例 Example — Hexagram 32 Heng"
- 三大工具卡片均等排列，不用假功能

### B. 咨询与资料填写

**易经（/consult/iching）——步骤强化：**

```
┌─────────────────────────────────────┐
│ ● ○ ○ ○          Step 2 of 4       │  ← 步骤指示器
├─────────────────────────────────────┤
│ (paper 背景)                        │
│                                     │
│ Where are you stuck?                │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ textarea                        ││
│ └─────────────────────────────────┘│
│                                     │
│        [← Back] [Continue →]        │
│                                     │
│ 你的输入自动保存，刷新不丢失            │  ← 微文字
└─────────────────────────────────────┘
```

- 步骤指示器：4 个圆点，当前步骤填实（cinnabar），已完成用 jade
- 按钮排列：Back（ghost 样式）在左，Continue（cinnabar）在右
- 错误提示紧贴字段（`border-cinnabar` + 文字提示），不用 alert

**合盘（/ziwei/synastry）——双方资料卡：**

```
桌面（≥768px）：
┌─────────────────┬─────────────────┐
│ Person A · 甲方  │ Person B · 乙方  │
│ (paper-panel)   │ (paper-panel)   │
│                 │                 │
│ Birth Date      │ Birth Date      │
│ [___________]   │ [___________]   │
│                 │                 │
│ Birth Hour      │ Birth Hour      │
│ [Select hour ▼] │ [Select hour ▼] │
│                 │                 │
│ Gender          │ Gender          │
 │ (♂) (♀)        │ (♂) (♀)        │
└─────────────────┴─────────────────┘
│ Relationship Type                  │
│ (Romantic) (Business) (Family) (Friend) │
└───────────────────────────────────┘
│       [Start Synastry →]           │
```

手机（<768px）：Person A 卡 → Person B 卡 → 关系类型 → 提交按钮（纵向堆叠）

- 未知时辰警告紧贴对应字段（不是页面底部）
- 提交按钮在所有字段有效前保持禁用（`opacity-50 cursor-not-allowed`）

### C. 结果与报告

**易经报告（/consult/iching/result）：**

```
┌─────────────────────────────────────┐
│ ┌─ Your Question ─────────────────┐│
│ │ (paper-panel 卡片)              ││
│ │ 问题原文                         ││
│ │ ✓ Saved to your account         ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─ Your Hexagram ─────────────────┐│
│ │ ┌────────┐  ┌────────┐          ││
│ │ │ 恒卦 32 │→ │ 解卦 40 │         ││
│ │ │ ━━━━━  │  │ ━ ━ ━  │         ││
│ │ │ ━━━━━ ◦│  │ ━ ━ ━  │         ││
│ │ │ ━━━━━  │  │ ━ ━ ━  │         ││
│ │ │ ━ ━ ━  │  │ ━ ━ ━  │         ││
│ │ │ ━━━━━  │  │ ━ ━ ━  │         ││
│ │ │ ━━━━━  │  │ ━ ━ ━  │         ││
│ │ └────────┘  └────────┘          ││
│ │ 本卦 (cinnabar) → 变卦 (jade)    ││
│ └─────────────────────────────────┘│
│                                     │
│ ▼ Classical Text 卦辞               │  ← 可折叠
│ ▼ Chart Data 盘面数据               │  ← 可折叠
│                                     │
│ ┌─ AI Interpretation ─────────────┐│
│ │ (paper-panel，ReactMarkdown)      ││
│ │ ...                               ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─ My Next Step ──────────────────┐│
│ │ [input] [Save]                   ││
│ └─────────────────────────────────┘│
│                                     │
│ [New Consultation] [Back] [History]│
└─────────────────────────────────────┘
```

**紫微报告（/ziwei/synastry/result）：**

```
┌─────────────────────────────────────┐
│ ┌─ Inputs ────────────────────────┐│
│ │ A: 1990-05-20 辰时 · B: 1992... ││
│ │ ✓ Saved                         ││
│ └─────────────────────────────────┘│
│                                     │
│ ▼ Person A Chart Data              │  ← 可折叠 12 宫表格
│ ▼ Person B Chart Data              │  ← 可折叠
│                                     │
│ ┌─ AI Interpretation ─────────────┐│
│ │ 6 章节结构化解读                  ││
│ └─────────────────────────────────┘│
│                                     │
│ [New Reading] [Back] [History]     │
└─────────────────────────────────────┘
```

---

## 七、技术实现约束

| 项 | 规则 |
|---|---|
| CSS 框架 | Tailwind 4 现有配置扩展（`tailwind.config.ts` 加色板） |
| 新增 JS 依赖 | **零** |
| 新增 CSS | 全局 < 200 行（含 reduced-motion、step indicator、palace grid 增强） |
| SVG | 仅用于卦象线条和简单指示器；数据驱动，不手绘装饰 |
| 十二宫 | CSS Grid（现有 `ZiweiChart` 模式） |
| SEO | 所有标题、正文、链接保持 HTML；不藏入 Canvas |
| 性能 | CSS-only 动效（< 1ms 主线程）；无字体增量 |

---

## 八、分阶段交付

### 第一阶段（本文档 + 静态原型）
- 本设计规格
- 3 个界面的 HTML 静态原型（桌面 + 手机）
- 合成数据（标注"示例"）
- **等待确认后再进入第二阶段**

### 第二阶段（实现）
- 修改 `tailwind.config.ts`（色板）
- 修改 `app/globals.css`（动效、reduced-motion）
- 修改 `app/page.tsx`（首页 Hero）
- 修改 `app/consult/iching/GuidedFlow.tsx`（步骤指示器）
- 修改 `components/ZiweiSynastry.tsx`（资料卡布局）
- 修改 `app/consult/iching/result/ResultView.tsx`（报告布局）
- 修改 `app/ziwei/synastry/result/SynastryResultView.tsx`（报告布局）
- **不修改任何业务逻辑、API、数据库**

---

*等待视觉方向确认。*
