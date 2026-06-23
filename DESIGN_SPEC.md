# GoEast.ai 视觉改版设计规格文档

> **版本**: v1.0 — 2026-06-23
> **视觉方向**: 现代宋版书（Modern Song Book）
> **参考预览**: 同目录下 `index.html`（完整可交互预览）
> **目标仓库**: `/Users/liupengcheng/develop/open_source/go-east`

---

## 一、设计哲学

将 GoEast.ai 从一个"通用 SaaS 产品页"转型为具有**中国传统美学底蕴**的哲学教育平台。核心原则：

- **宋版书气质** — 方正、留白、衬线标题、墨色文字
- **去 SaaS 化** — 去掉圆角卡片、描边框、emoji 图标、渐变色按钮等科技产品常见元素
- **一笔墨迹** — 装饰元素用极简 SVG 笔画模拟毛笔/印章效果，不用卡通插图
- **双语平衡** — 中文为主视觉层级，英文为辅；不再让英文占据绝对主导

---

## 二、色彩系统（Design Tokens）

### 2.1 现有 Token（`tailwind.config.ts`）

| Token | 当前值 | 状态 |
|-------|--------|------|
| `cream` | `#faf5ef` | ✅ 保留，作为页面底色 |
| `ink` | `#2c1810` | ✅ 保留，作为主要文字色 |
| `warm` | `#8b7355` | ✅ 保留，作为次要文字色 |
| `china-red` | `#c0392b` | ✅ 保留，作为强调色（按钮/链接） |
| `gold` | `#8e6d45` | ✅ 保留，用于 Hero 装饰色 |
| `sand` | `#e0d5c5` | ✅ 保留，作为边框/分隔色 |

**结论：色彩系统不需要改动。** 现有的 6 个 token 已经构成了一套完整的暖色调体系。

### 2.2 新增 Token（用于卡片背景）

在 Tailwind 配置中不需要新增 token，直接使用 `bg-cream/60` 作为卡片背景色（cream 的 60% 透明度叠加在 cream 底色上），在 CSS 中对应：

```css
/* 卡片背景色 — 微黄，融入整体暖调而非纯白跳出 */
--card-bg: oklch(96.5% 0.008 75);  /* ≈ #f5efe6 */
```

---

## 三、字体系统（Typography）

### 3.1 现状

```tsx
// app/layout.tsx — 当前只加载了 Inter
const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-latin-400.woff2", weight: "400" },
    { path: "../public/fonts/Inter-latin-700.woff2", weight: "700" },
  ],
  display: "swap",
});
```

**问题**：Inter 是科技/SaaS 字体，与中国哲学内容气质严重不符。

### 3.2 目标字体方案

| 层级 | 字体 | 用途 |
|------|------|------|
| Display（标题） | **Noto Serif SC**（思源宋体） | 所有 h1-h3、哲人名字、章节标题 |
| Body（正文） | **Noto Sans SC** + Inter（fallback） | 正文、导航、按钮、描述文字 |
| Mono（元数据） | **JetBrains Mono** | 年代、章节号、页码等技术信息 |

### 3.3 实施步骤

**Step 1 — 下载字体文件**

需要下载以下字体文件到 `public/fonts/` 目录：

```
public/fonts/
├── NotoSerifSC-Regular.woff2    (400)
├── NotoSerifSC-Bold.woff2       (700)
├── NotoSansSC-Regular.woff2     (400)
├── NotoSansSC-Medium.woff2      (500)
├── Inter-latin-400.woff2        (已有)
├── Inter-latin-700.woff2        (已有)
└── JetBrainsMono-Regular.woff2  (新增)
```

下载来源：
- Noto Serif SC / Noto Sans SC: https://fonts.google.com/noto/specimen/Noto+Serif+SC
- JetBrains Mono: https://www.jetbrains.com/lp/mono/

**Step 2 — 修改 `app/layout.tsx`**

```tsx
import localFont from "next/font/local";

// 新增：思源宋体（标题）
const notoSerifSC = localFont({
  src: [
    { path: "../public/fonts/NotoSerifSC-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/NotoSerifSC-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-serif",
  display: "swap",
});

// 新增：思源黑体（正文）
const notoSansSC = localFont({
  src: [
    { path: "../public/fonts/NotoSansSC-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/NotoSansSC-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-sans-sc",
  display: "swap",
});

// 保留：Inter（英文正文 fallback）
const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({ children }: ...) {
  return (
    <html lang="en">
      <body className={`${notoSerifSC.variable} ${notoSansSC.variable} ${inter.variable} ...`}>
        ...
      </body>
    </html>
  );
}
```

**Step 3 — 修改 `app/globals.css`**

```css
@import "tailwindcss";
@config "../tailwind.config.ts";
@plugin "@tailwindcss/typography";

html {
  scroll-behavior: smooth;
}

body {
  background-color: #faf5ef;  /* cream */
  color: #2c1810;             /* ink */
  font-family: var(--font-sans-sc), var(--font-inter), system-ui, sans-serif;
}

/* 标题统一用宋体 */
h1, h2, h3 {
  font-family: var(--font-serif), Georgia, serif;
}

/* 年代/章节号等用等宽字体 */
.font-mono, .era, .chapter-badge {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
```

**Step 4 — 修改 `tailwind.config.ts`**

```ts
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#faf5ef",
        ink: "#2c1810",
        warm: "#8b7355",
        "china-red": "#c0392b",
        gold: "#8e6d45",
        sand: "#e0d5c5",
      },
      fontFamily: {
        // 修改：serif 用于标题
        serif: ["var(--font-serif)", "Georgia", "serif"],
        // 修改：sans 正文用 Noto Sans SC + Inter fallback
        sans: ["var(--font-sans-sc)", "var(--font-inter)", "system-ui", "sans-serif"],
        // 新增：mono 用于元数据
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
```

### 3.4 字体应用规则

| 元素 | font-family | 说明 |
|------|-------------|------|
| `h1`, `h2`, `h3` | `font-serif`（思源宋体） | 所有区块标题、哲人名字 |
| 导航链接 | `font-sans`（思源黑体） | Header/Footer 导航 |
| 正文段落 | `font-sans` | 描述文字、副标题 |
| 按钮文字 | `font-sans` | CTA 按钮 |
| 章节号/年代 | `font-mono`（JetBrains Mono） | 如 "Ch.3", "551–479 BCE" |
| 徽章/标签 | `font-mono` | badge 文字 |
| 引用块文字 | `font-serif` + italic | CitationSnippet |

---

## 四、文件级修改清单

### 4.1 `app/layout.tsx` — 字体加载

**改动要点**：
- 新增 `notoSerifSC` 和 `notoSansSC` 两个 localFont 实例
- 将 CSS variable 注入 body className
- 保留原有 `inter` 作为 fallback

### 4.2 `app/globals.css` — 全局样式

**改动要点**：
- 新增 `h1, h2, h3 { font-family: var(--font-serif) }` 规则
- body 的 font-family 改为 `var(--font-sans-sc)` 优先

### 4.3 `tailwind.config.ts` — 字体 Token

**改动要点**：
- `fontFamily.sans` 改为 Noto Sans SC 优先
- 新增 `fontFamily.serif` 指向 Noto Serif SC
- 新增 `fontFamily.mono` 指向 JetBrains Mono

### 4.4 `components/Hero.tsx` — Hero 区域重设计

**现状**：
```tsx
<section className="text-center py-20 md:py-28 px-4 bg-gradient-to-br from-ink via-ink/95 to-gold/20">
  <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">GoEast.ai presents</p>
  <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Sophie's Journey East</h1>
  <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-2">
    Having escaped the pages of a book, a young girl travels East — and meets
    the philosophers who shaped a civilization.
  </p>
  <p className="text-sm text-white/40 max-w-xl mx-auto mb-8">苏菲的东方之旅</p>
  ...
</section>
```

**改为**：

```tsx
<section className="relative text-center overflow-hidden"
  style={{
    minHeight: '520px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(170deg, #1a1410 0%, #2c1810 50%, #3d2518 100%)',
  }}>

  {/* Layer 2: SVG 山水剪影（背景装饰） */}
  <div style={{
    position: 'absolute', bottom: 0, left: 0, width: '100%', height: '55%',
    pointerEvents: 'none',
  }}>
    <svg viewBox="0 0 1920 600" preserveAspectRatio="xMidYMax slice" fill="none"
      style={{ width: '100%', height: '100%' }}>
      {/* 远山 */}
      <path d="M0,380 Q120,220 320,310 Q480,180 680,290 Q840,160 1020,270 Q1180,190 1340,260 Q1500,170 1680,250 Q1800,200 1920,240 L1920,600 L0,600Z"
        fill="white" opacity="0.04"/>
      {/* 中山 */}
      <path d="M0,440 Q200,320 420,390 Q560,280 760,360 Q920,290 1100,350 Q1260,300 1420,340 Q1600,280 1780,330 Q1860,310 1920,320 L1920,600 L0,600Z"
        fill="white" opacity="0.055"/>
      {/* 近山 */}
      <path d="M0,500 Q160,420 360,460 Q520,390 700,440 Q860,400 1040,430 Q1200,390 1380,420 Q1540,400 1700,430 Q1820,410 1920,420 L1920,600 L0,600Z"
        fill="white" opacity="0.07"/>
      {/* 雾气 */}
      <path d="M0,540 Q400,510 800,530 Q1200,500 1600,520 Q1800,510 1920,520 L1920,600 L0,600Z"
        fill="white" opacity="0.03"/>
    </svg>
  </div>

  {/* Layer 3: 内容 */}
  <div style={{ position: 'relative', zIndex: 2, padding: '80px 24px 100px', maxWidth: 720 }}>

    {/* 品牌标识行 — mono 小字 */}
    <p style={{
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.35)', marginBottom: 24,
    }}>
      AI × 东方智慧
    </p>

    {/* 中文主标题 — serif 大字 */}
    <h1 className="font-serif" style={{
      fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 700, color: '#fff',
      lineHeight: 1.2, marginBottom: 8, letterSpacing: '0.04em',
    }}>
      苏菲的东方之旅
    </h1>

    {/* 英文副标题 — serif italic 弱化 */}
    <p className="font-serif" style={{
      fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 400,
      color: 'rgba(255,255,255,0.45)', marginBottom: 28, fontStyle: 'italic',
    }}>
      Sophie&apos;s Journey East
    </p>

    {/* 功能性描述 — 让陌生用户理解产品价值 */}
    <p style={{
      fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8,
      marginBottom: 12, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
    }}>
      AI 驱动的中国哲学探索 —— 从孔子到易经，<br/>
      三千年思想，通过 AI 对话重新唤醒。
    </p>

    {/* 诗意副文 — serif italic 弱化 */}
    <p className="font-serif" style={{
      fontSize: 14, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic',
      marginBottom: 36,
    }}>
      跨越书页，一位少女东行，遇见塑造文明的哲人。
    </p>

    {/* 按钮组 — rounded-sm 替代 rounded-lg */}
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
      <a href="#journey" style={{
        display: 'inline-block', padding: '12px 28px',
        background: '#c0392b', color: '#fff', fontSize: 15, fontWeight: 500,
        borderRadius: 4, textDecoration: 'none',
        fontFamily: 'var(--font-sans-sc, system-ui)',
      }}>
        开始旅程 →
      </a>
      <Link href="/skills" style={{
        display: 'inline-block', padding: '12px 28px',
        background: 'transparent', color: 'rgba(255,255,255,0.65)',
        fontSize: 15, fontWeight: 400, borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.20)', textDecoration: 'none',
        fontFamily: 'var(--font-sans-sc, system-ui)',
      }}>
        浏览技能
      </Link>
    </div>
  </div>
</section>
```

**Hero 底部过渡**：在 Hero 组件末尾或 page.tsx 中，Hero 和 CitationSnippet 之间加入渐变过渡效果。可以通过 CSS 伪元素实现：

```css
/* 在 Hero section 上添加 */
.hero::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 120px;
  background: linear-gradient(to bottom, transparent, #faf5ef);
  z-index: 1;
  pointer-events: none;
}
```

### 4.5 `components/CitationSnippet.tsx` — 引用块重设计

**现状**：需要查看当前实现，但根据 page.tsx 中的用法，它被包裹在 `max-w-3xl mx-auto px-4 pt-8` 中。

**改为**：左侧 3px 红线引用块样式

```tsx
// CitationSnippet.tsx 改为：
export default function CitationSnippet({ text }: { text: string }) {
  return (
    <blockquote style={{
      borderLeft: '3px solid rgba(192, 57, 43, 0.6)',  /* china-red/60 */
      paddingLeft: 28,
      margin: 0,
      padding: '48px 32px 56px',
    }}>
      <p className="font-serif" style={{
        fontSize: 16, color: '#8b7355',  /* warm */
        fontStyle: 'italic', lineHeight: 1.9,
      }}>
        {text}
      </p>
    </blockquote>
  );
}
```

### 4.6 `components/JourneyTimeline.tsx` — 时间线卡片去 SaaS 化

**改动要点**：

1. **卡片样式**：
   - `rounded-xl border border-sand` → `rounded-sm` 无描边
   - `bg-white` → `bg-cream/60`
   - `hover:border-china-red/30` → `hover:shadow-md`
   - 图片区域底部加墨色渐变遮罩

2. **具体 className 替换**：

| 位置 | 原 className | 新 className |
|------|-------------|-------------|
| 卡片容器 | `bg-white rounded-xl border border-sand overflow-hidden hover:border-china-red/30 hover:shadow-sm transition-all` | `bg-cream/60 rounded-sm overflow-hidden hover:shadow-md transition-shadow` |
| 卡片图片 | 保持不变（已有真实图片） | 添加底部渐变遮罩层 |
| 文字区 padding | `p-3` | `p-5`（更透气） |

3. **图片遮罩层**：在有图片的分支中，`Image` 组件的外层 div 追加一个遮罩：

```tsx
<div className="relative w-20 sm:w-24 flex-shrink-0">
  <Image ... />
  {/* 新增：底部墨色渐变 */}
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '40%',
    background: 'linear-gradient(to top, rgba(44,24,16,0.15), transparent)',
  }} />
</div>
```

### 4.7 `components/PhilosopherCard.tsx` — 哲人卡片重设计

**改动要点**：

1. **卡片样式**：
   - `rounded-xl border border-sand` → `rounded-sm` 无描边 + 淡阴影
   - `bg-white` → `bg-cream/60`
   - `hover:border-china-red/30 hover:shadow-md` → `hover:shadow-md`

2. **无图片时的 fallback 图标**：
   - 原：显示 `school?.symbol`（一个 Unicode 字符如 "●"）
   - 改为：显示极简 SVG 线性图标（见下方 SVG 图标规范）

3. **文字排版**：
   - 哲人名字用 `font-serif`（思源宋体）
   - padding 从 `p-3` 增加到 `p-5`

```tsx
<div className="bg-cream/60 rounded-sm overflow-hidden hover:shadow-md transition-shadow text-center h-full">
  {imagePath ? (
    <div className="relative aspect-[3/4] overflow-hidden">
      <Image ... />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '50%',
        background: 'linear-gradient(to top, rgba(44,24,16,0.12), transparent)',
      }} />
    </div>
  ) : (
    <div className="h-24 flex items-center justify-center">
      {/* SVG 图标 fallback — 见下方图标规范 */}
      <svg viewBox="0 0 40 40" style={{
        width: 36, height: 36, stroke: '#2c1810', strokeWidth: 1,
        strokeLinecap: 'round', fill: 'none', opacity: 0.3,
      }}>
        {/* 根据 school 类型渲染不同图标 */}
      </svg>
    </div>
  )}
  <div className="p-5">
    <h3 className="font-serif font-semibold text-ink group-hover:text-china-red transition-colors text-sm">
      {journey.philosopher || "Journey's End"}
    </h3>
    ...
  </div>
</div>
```

### 4.8 `app/page.tsx` — 页面结构修改

#### 4.8.1 I Ching 区块增强

**现状**：
```tsx
<section className="max-w-4xl mx-auto px-4 py-16 border-t border-sand text-center">
  <h2 className="text-2xl font-bold text-ink mb-2">I Ching · 易经</h2>
  <p className="text-warm mb-4">The Book of Changes — 3,000 years of wisdom encoded in 64 hexagrams</p>
  <Link href="/iching" className="inline-block px-6 py-2.5 rounded-full bg-china-red ...">
    Explore the I Ching →
  </Link>
</section>
```

**改为**：左右分栏布局，左侧六十四卦 SVG 装饰

```tsx
<section className="max-w-5xl mx-auto px-4 py-16 border-t border-sand">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
    {/* 左侧：六十四卦 SVG 阵列装饰 */}
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6,
      opacity: 0.18,
    }}>
      {/* 用 JS 动态生成 64 个卦象，每个是 6 根横线组合 */}
      {/* 实线 ⚊ = 一条横线；断线 ⚋ = 中间断开的横线 */}
    </div>

    {/* 右侧：内容 */}
    <div>
      <h2 className="font-serif text-2xl font-bold text-ink mb-3">I Ching · 易经</h2>
      <p className="text-warm mb-7 text-base leading-relaxed">
        The Book of Changes — 3,000 years of wisdom encoded in 64 hexagrams.<br/>
        Consult AI Oracles modeled after ancient thinkers.
      </p>
      <Link href="/iching" className="inline-block px-7 py-3 bg-china-red text-white font-medium text-sm rounded-sm hover:bg-china-red/90 transition-colors no-underline">
        Explore the I Ching →
      </Link>
    </div>
  </div>
</section>
```

#### 4.8.2 Learn Deeper 区块增强

**现状**：纯文字 + 按钮，视觉吸引力弱。

**改为**：背景超大字装饰 + 前景内容

```tsx
<section className="max-w-4xl mx-auto px-4 py-16 border-t border-sand text-center relative overflow-hidden">
  {/* 背景装饰：三个大字号中文概念 */}
  <div style={{
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex', gap: 'clamp(40px, 10vw, 120px)',
    pointerEvents: 'none', zIndex: 0,
  }}>
    <span className="font-serif" style={{
      fontSize: 'clamp(80px, 15vw, 180px)', fontWeight: 900,
      color: '#2c1810', opacity: 0.06, lineHeight: 1,
    }}>仁</span>
    <span className="font-serif" style={{
      fontSize: 'clamp(80px, 15vw, 180px)', fontWeight: 900,
      color: '#2c1810', opacity: 0.06, lineHeight: 1,
    }}>道</span>
    <span className="font-serif" style={{
      fontSize: 'clamp(80px, 15vw, 180px)', fontWeight: 900,
      color: '#2c1810', opacity: 0.06, lineHeight: 1,
    }}>阴阳</span>
  </div>

  {/* 前景内容 */}
  <div style={{ position: 'relative', zIndex: 1 }}>
    <h2 className="font-serif text-2xl font-bold text-ink mb-2">Learn Deeper · 深入探索</h2>
    <p className="text-warm mb-6 max-w-md mx-auto">
      Key concepts explained in our Glossary, and philosophical essays in our Insights section.
    </p>
    <div className="flex gap-3 justify-center flex-wrap">
      <Link href="/glossary" className="inline-block px-7 py-3 bg-ink text-white font-medium text-sm rounded-sm hover:bg-ink/90 transition-colors no-underline">
        Glossary →
      </Link>
      <Link href="/insights" className="inline-block px-7 py-3 bg-gold text-white font-medium text-sm rounded-sm hover:bg-gold/90 transition-colors no-underline">
        Insights →
      </Link>
    </div>
  </div>
</section>
```

#### 4.8.3 Skills 区块 — emoji 图标替换为 SVG

**现状**：
```tsx
<div className="text-2xl mb-1">{cat.icon}</div>  {/* emoji 图标 */}
```

**改为**：极简线性 SVG 图标

| 类别 | 原 emoji | SVG 图标方向 |
|------|----------|-------------|
| 旅行 Travel |  | 指南针 compass |
| 医疗 Medical | 🏥 | 十字/草药 herb |
| 购物 Shopping | 🛒 | 袋子 bag |
| 住宿 Housing |  | 屋檐 roof |
| 美食 Food | 🍜 | 碗 bowl |
| 语言 Language | 💬 | 对话气泡 chat |

SVG 样式规范：
- `width: 22px; height: 22px`
- `stroke: var(--fg); stroke-width: 1.5; fill: none`
- 放在 `44×44` 的 `rounded-sm` 方框内
- 方框背景 `bg-surface`，边框 `border border-sand/50`

```tsx
{/* 类别卡片改造 */}
<Link key={cat.id} href={`/categories/${cat.id}`}
  className="bg-cream/60 rounded-sm p-6 text-center hover:shadow-md transition-shadow group no-underline">
  {/* SVG 图标容器 */}
  <div style={{
    width: 44, height: 44, margin: '0 auto 12px',
    borderRadius: 4, background: '#fff', border: '1px solid rgba(224,213,197,0.5)',
    display: 'grid', placeItems: 'center',
  }}>
    {/* 根据 cat.id 渲染对应 SVG */}
    {cat.id === 'travel' && <CompassIcon />}
    {cat.id === 'medical' && <HerbIcon />}
    {/* ... */}
  </div>
  <div className="font-serif font-semibold text-ink text-sm group-hover:text-china-red transition-colors">
    {cat.name}
  </div>
  <div className="text-xs text-warm/50 mt-1 font-mono">{count} skills</div>
</Link>
```

#### 4.8.4 SkillCard 组件同步修改

`components/SkillCard.tsx` 中的卡片也需要去 SaaS 化：

| 属性 | 原值 | 新值 |
|------|------|------|
| 圆角 | `rounded-xl` | `rounded-sm` |
| 边框 | `border border-sand` | 去掉边框，用 `shadow-sm` |
| 背景 | `bg-white` | `bg-cream/60` |
| Hover | `hover:border-china-red/30` | `hover:shadow-md` |

### 4.9 `components/Footer.tsx` — Footer 重组

**现状**：所有链接平铺在一行，共 10+ 个。

**改为**：三行分组

```tsx
<footer className="border-t border-sand mt-16">
  {/* 第一行：主导航 */}
  <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap justify-center gap-6">
    <Link href="/philosophers" className="text-sm text-ink hover:text-china-red no-underline">Philosophers</Link>
    <Link href="/iching" className="text-sm text-ink hover:text-china-red no-underline">I Ching</Link>
    <Link href="/glossary" className="text-sm text-ink hover:text-china-red no-underline">Glossary</Link>
    <Link href="/insights" className="text-sm text-ink hover:text-china-red no-underline">Insights</Link>
    <Link href="/skills" className="text-sm text-ink hover:text-china-red no-underline">Skills</Link>
    <Link href="/#journey" className="text-sm text-ink hover:text-china-red no-underline">Journey</Link>
  </div>

  {/* 分隔线 */}
  <hr style={{ borderColor: 'rgba(224,213,197,0.5)', maxWidth: '6xl', margin: '0 auto' }} />

  {/* 第二行：资源链接（小字弱化） */}
  <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-center gap-5">
    <Link href="/about" className="text-xs text-warm/60 hover:text-warm no-underline">About</Link>
    <Link href="/contact" className="text-xs text-warm/60 hover:text-warm no-underline">Contact</Link>
    <Link href="/llms.txt" className="text-xs text-warm/60 hover:text-warm no-underline">For Agents</Link>
    <Link href="/api/skills" className="text-xs text-warm/60 hover:text-warm no-underline">API</Link>
  </div>

  {/* 第三行：版权 */}
  <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-center">
    <span className="text-xs text-warm/40">© 2024 GoEast.ai — 苏菲的东方之旅</span>
  </div>
</footer>
```

### 4.10 `components/Header.tsx` — 导航微调

**改动较小**，主要两点：
1. Logo 文字改为 `font-serif`（思源宋体）
2. 按钮圆角从 `rounded-lg` 改为 `rounded-sm`（4px）

```tsx
// Logo
<Link href="/" className="text-xl font-bold text-ink font-serif">
  GoEast<span className="text-china-red">.ai</span>
</Link>

// Submit 按钮
<Link href="/submit"
  className="bg-china-red text-white px-4 py-1.5 rounded-sm text-sm hover:bg-china-red/90 transition-colors no-underline">
  Submit
</Link>

// 用户菜单下拉
<div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-sm shadow-lg border border-sand/50 py-1 z-50">
  {/* ... */}
</div>
```

### 4.11 `components/OracleCta.tsx` — Oracle CTA 按钮圆角

将按钮从 `rounded-full`（胶囊形）改为 `rounded-sm`（方正）：

```tsx
// 原：rounded-full
// 改：rounded-sm
<Link href="/iching" className="inline-block px-7 py-3 bg-china-red text-white font-medium text-sm rounded-sm ...">
```

### 4.12 `components/FAQ.tsx` — FAQ 样式微调

- 问题文字改为 `font-serif`
- 分隔线颜色改为 `border-sand`（已有）
- 展开/折叠符号用 `+` / `−`（已有）

---

## 五、SVG 图标规范

### 5.1 设计原则

- **极简线性**：1-3 笔 strokes，无填充
- **墨迹感**：`stroke-linecap: round`，模拟毛笔圆锋
- **低透明度**：`opacity: 0.3-0.4`，像宣纸上淡淡的笔触
- **统一尺寸**：22×22px（技能图标）/ 36×36px（哲人卡片 fallback）
- **颜色**：`stroke: var(--fg)` 即 `#2c1810`（墨色）

### 5.2 哲人卡片 fallback 图标（按学派）

| 学派 | 图标 | SVG 描述 |
|------|------|----------|
| 儒家（Confucius, Mencius） | 一竖两横 | `<line x1="20" y1="6" x2="20" y2="34"/><line x1="10" y1="16" x2="30" y2="16"/><line x1="12" y1="26" x2="28" y2="26" opacity="0.5"/>` |
| 道家（Laozi） | S 曲线 + 墨点 | `<path d="M10 8 Q10 20 20 20 Q30 20 30 32"/><circle cx="10" cy="8" r="1.5" fill="currentColor" opacity="0.4"/>` |
| 道家（Zhuangzi） | 两道对称弧 | `<path d="M14 28 Q16 14 20 12"/><path d="M26 28 Q24 14 20 12" opacity="0.6"/>` |
| 兵家（Sunzi） | 一记斜撇 + 短锋 | `<line x1="28" y1="8" x2="12" y2="32" stroke-width="1.8"/><line x1="24" y1="10" x2="30" y2="8" opacity="0.4"/>` |
| 法家（Han Feizi） | 两竖两横格栅 | `<line x1="8" y1="8" x2="8" y2="32" stroke-width="1.5"/><line x1="32" y1="8" x2="32" y2="32" stroke-width="1.5"/><line x1="8" y1="14" x2="32" y2="14" opacity="0.6"/><line x1="8" y1="26" x2="32" y2="26" opacity="0.6"/>` |
| 墨家（Mozi） | 同心圆 | `<circle cx="20" cy="20" r="10"/><circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.5"/>` |
| 心学（Wang Yangming） | 墨点 + 两弧 | `<circle cx="20" cy="20" r="2.5" fill="currentColor"/><path d="M14 14 Q20 8 26 14" opacity="0.4"/><path d="M14 26 Q20 32 26 26" opacity="0.4"/>` |

### 5.3 技能类别图标

每个图标是 22×22 的线性 SVG，`stroke-width: 1.5`，`fill: none`。

**Travel（指南针）**：
```svg
<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M12 3l-3 3M12 3l3 3"/></svg>
```

**Medical（草药）**：
```svg
<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"/></svg>
```

**Shopping（袋子）**：
```svg
<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>
```

**Housing（屋檐）**：
```svg
<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
```

**Food（碗）**：
```svg
<svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
```

**Language（对话气泡）**：
```svg
<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
```

---

## 六、全局样式规则变更汇总

### 6.1 圆角系统

| 元素 | 原值 | 新值 |
|------|------|------|
| 所有卡片（Philosopher, Journey, Skill, Category） | `rounded-xl`（12px） | `rounded-sm`（2px） |
| 按钮（CTA, Submit） | `rounded-lg`（8px）或 `rounded-full` | `rounded-sm`（4px） |
| 下拉菜单 | `rounded-lg` | `rounded-sm` |
| 徽章/标签 | `rounded` / `rounded-full` | `rounded-sm`（3px） |

### 6.2 卡片系统

| 属性 | 原值 | 新值 |
|------|------|------|
| 背景 | `bg-white` | `bg-cream/60` |
| 边框 | `border border-sand` | 去掉，改用 `shadow-sm` |
| Hover 效果 | `hover:border-china-red/30 hover:shadow-sm` | `hover:shadow-md` |
| 内边距 | `p-3` / `p-4` | `p-5`（更透气） |

### 6.3 按钮系统

| 属性 | 原值 | 新值 |
|------|------|------|
| 圆角 | `rounded-lg` / `rounded-full` | `rounded-sm`（4px） |
| 主按钮 padding | `px-6 py-2.5` | `px-7 py-3` |

### 6.4 分隔线

Section 之间的 `border-t border-sand` 保持不变，这是正确的视觉节奏。

---

## 七、实施优先级

### P0 — 必须首先完成

1. **字体系统** — 下载字体文件 → 修改 `layout.tsx` → 修改 `globals.css` → 修改 `tailwind.config.ts`
2. **Hero 重设计** — 修改 `Hero.tsx`（山水 SVG + 文案层级 + 按钮圆角）
3. **卡片去 SaaS 化** — 修改 `PhilosopherCard.tsx`、`JourneyTimeline.tsx`、`SkillCard.tsx` 的 className

### P1 — 视觉增强

4. **CitationSnippet** — 改为引用块样式
5. **I Ching 区块** — 添加六十四卦 SVG 装饰 + 左右分栏
6. **Learn Deeper 区块** — 添加背景大字装饰
7. **Skills 图标** — emoji 替换为 SVG
8. **Footer 重组** — 三行分组

### P2 — 细节打磨

9. **Header 微调** — Logo 字体 + 按钮圆角
10. **OracleCta 按钮** — 圆角改为 rounded-sm
11. **FAQ 字体** — 问题文字改为 font-serif

---

## 八、注意事项

1. **不要改动色彩 Token** — 现有 6 个颜色已经合适，不需要调整
2. **不要改动页面结构/路由** — 只改样式和组件内部实现
3. **保留所有功能逻辑** — 认证、导航、数据加载等逻辑完全不变
4. **font-serif 需要全局应用** — 确保所有 h1/h2/h3 和哲人名字都用宋体
5. **移动端适配** — 所有改动需要保持响应式，特别是 Hero 的 `clamp()` 字体和 I Ching 分栏在小屏下改为单列
6. **性能** — Noto Serif SC 和 Noto Sans SC 文件较大，建议只加载需要的字重（400, 500, 700），使用 `display: swap` 避免 FOIT

---

## 九、参考文件

- **完整预览**：`index.html`（同目录，可直接在浏览器打开查看效果）
- **原始截图**：`mqpzg6wr-image.png`（Hero + 上半页）、`mqpzg6wv-image.png`（时间线）
- **原始仓库**：`/Users/liupengcheng/develop/open_source/go-east`
