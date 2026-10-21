# GoEast 第一周修复 — 交付报告

**分支**：`fix/week1-seo-login-oracle-content`（自 `main` = 579ec64 分出，21 个提交，33 个文件，未 push、未合并、未发布）
**日期**：2026-10-21
**计划文档**：`docs/superpowers/plans/2026-10-21-week1-fixes.md`（逐任务实现 + 两阶段审查：规格合规 → 代码质量）

---

## 一、逐项修复记录（复现证据 → 修改 → 说明）

### 1. 合盘页 SEO 标签（/ziwei/synastry）

**复现**：页面无自己的 `alternates`，根布局 `app/layout.tsx:52-58` 的 `canonical: "/"` + en hreflang 经 Next.js metadata 浅合并泄漏至该页（线上 canonical/hreflang 指向首页）；WebApplication JSON-LD 硬编码非 www 地址（`page.tsx:50`）。

**修改**：`app/layout.tsx`（删除泄漏块）、`app/page.tsx`（首页自持 alternates）、`app/ziwei/synastry/page.tsx`（自指 canonical + en/x-default hreflang + JSON-LD 改 www）。提交 `f826720`。

**验收**（本地生产构建 + 服务端 HTML，见第四节）：synastry canonical = hreflang = `https://www.goeast.ai/ziwei/synastry`，仅一组标签；JSON-LD 仅 www；/、/iching、/ziwei、/sophies-journey、/iching/qian 各自 canonical 正确不变；sitemap 全量 272 个 URL 扫描 0 个异常。

### 2. 登录返回与体验状态

**复现**（静态代码证据，已逐条核实）：
- `app/login/page.tsx:10` 读 `next` 无校验；定价页传 `redirect`（`pricing-client.tsx:60`）被忽略 → 落到 /account；
- 注册邮箱链接与 Google OAuth 的 `redirectTo` 完全不带 next（login:43,63）；
- `app/auth/callback/route.ts` 对 next **零校验**直接拼进重定向（开放重定向面）；
- 8 处工具组件硬跳 `/login` 无返回目标（ZiweiInterpretation:38,57,129 / ZiweiSynastry:119,142,211 / OracleOverlay:529,550,572），且无任何状态持久化（全站无 localStorage/sessionStorage 使用）。

**修改**：
- 新增 `lib/auth-redirect.ts`：`sanitizeNextPath`（迭代解码、拒绝外链/协议相对/`/\`/编码绕过/控制字符/反斜杠/点段/登录循环 `/login`/`/auth`/`/api`/超长，安全默认 `/account`）+ `loginUrlWithNext`（仅取 pathname，不带任何用户输入）。提交 `7b4c06e` + 加固 `64e9d0e`。
- 登录页：`next` 经校验；注册/OAuth `redirectTo` = `/auth/callback?next=…`；`?error=auth` 失败横幅。回调路由：`next` 经校验；**失败路径保留 next**（`b3d26dd`）。提交 `d781ff7`。
- 定价页两处登录链接统一 `?next=/pricing`（`d781ff7`）。
- 新增 `lib/draft.ts`（sessionStorage 草稿，best-effort，无网络/日志）：
  - 易经：保留掷币结果，恢复**不重掷**（`b4364b1`）；
  - 紫微命盘：出生数据草稿 + `astro.bySolar` 确定性重算 = 同一张盘（`accdfca`）；
  - 合盘：双人出生数据 + 关系类型草稿；登录前即显示表单（填表免费），分析需登录（`accdfca`）；
  - Oracle：问题草稿按哲学家分键，成功（SSE `[DONE]`）后清除，失败保留（`6307b69` + 类型守卫 `496d04e`）。
- 登录检查进行中（null）不误跳登录，放行至 API 401 兜底（`8ba5937`）。

**安全属性**：出生信息/问题只存 sessionStorage，从不进 URL（`loginUrlWithNext` 仅 pathname）、不进分析事件、不进日志；返回目标两端（发送/接收）均经同一校验器。

**额度不重复扣减**（代码级论证 + 审查确认）：三个 AI 端点额度仅在**已授权请求**时服务端计数（`app/api/oracle/route.ts:73-107`）；草稿恢复路径零 API 调用；返回工具不自动提交——用户重新点击才发请求；401 发生于任何计数之前。易经起卦纯客户端、无登录、无额度。

### 3. Oracle 按钮真实目的地

**复现**：`components/OracleCta.tsx:28` 一律链接 `/sophies-journey` 目录；真实交互仅在章节页哲学家头像（`PhilosopherIntro` → `OracleOverlay`，`app/sophies-journey/[slug]/page.tsx:176`）。

**修改**：章节页头像容器加 `id="oracle"` + `scroll-mt-24`；OracleCta 经 `PHILOSOPHER_SLUGS[].portrait_slug` 解析对应旅程 slug（哲学家 slug → 旅程 slug 映射天然存在），链接 `/sophies-journey/<旅程slug>#oracle`；无哲学家上下文的通用 CTA 默认周公（占卜之祖，其按钮文案即 "Cast the Oracle"，承诺相符）；17 篇无 `philosopher_slug` 的实用指南文章改显示 "Explore more China guides" 指南导航（China Travel Guide + More Practical Guides），不再强行导向问卦。提交 `116f6d8` + `430c092`。

**验收**（服务端 HTML，见第四节映射表）：iching 首页/乾卦/daily-iching/首页/列表页 → `prologue-zhougong#oracle`；`/philosophers/laozi`、wu-wei 文章 → `ch01-laozi#oracle`；`/philosophers/zhu-xi` → `ch07-zhuxi#oracle`；alipay 文章 0 个 Oracle CTA、指南 CTA 存在；两个章节页锚点各 1 处。未新建第二套 Oracle，未改额度/模型/付费规则。

### 4. 文章与 FAQ 渲染

**复现**（比线上核查范围更大）：
- **21/21 篇** insights 正文首行都有 `# 标题` → 页面 H1（frontmatter）+ 正文 H1 全部重复（不止报告的 3 篇）；
- `lib/insights.ts:44` 管线无 GFM → 12 篇文章的表格以管道符文本显示；
- FAQ 单词截断源头在**截取逻辑**而非源内容：`lib/faq-templates.ts` 四处 `.slice(0, N)`（技能:32/术语:77/卦辞:92/无 frontmatter FAQ 的 17 篇文章 fallback:131）+ `app/iching/[hexagram]/page.tsx:29` meta 描述 slice(0,120)；乾卦 FAQ 线上截断复现（"...It benefits all thin"）；
- 内部话术仅 Alipay 一处（`content/insights/alipay-vs-wechat-pay-foreigner.md:138-140` "SEO takeaway for expat users"，全 content 目录 grep 确认唯一）。

**修改**：
- `npm i remark-gfm`；`lib/insights.ts` 双管线（正文+中文）加 GFM、新增 `stripDuplicateTitleH1`（仅当正文 H1 与 frontmatter 标题一致时剥离——大小写/引号归一）；**转义属性保持**：remark-html 默认转义原始 HTML、剥离危险协议（`javascript:` 链接实测被剥除、原始 `<tag>` 实测不透传，测试固化 `<script` 断言）。提交 `5b613aa`。
- `app/globals.css`：`.prose table { display:block; overflow-x:auto; max-width:100% }` 手机横向滚动（其余 prose 消费方——skills/journeys/glossary——无表格，无回归面）。
- 新增 `lib/text.ts` `clipText`（句子边界优先 ≥40% 预算，退词边界+省略号，绝不切词中、绝不编造；单词超预算时退纯省略号）；四处 FAQ + iching meta 描述全部替换，**可见 FAQ 与 FAQPage JSON-LD 由同一生成器对象派生，天然同步**。提交 `adeaa9d` + 分支测试 `78b523a`。
- 内容删除（纯删除、不扩写）：Alipay SEO 小节、taoism-vs-confucianism / yin-yang-explained（Task 9 审查发现标题不匹配的残留）、chinese-culture-guide（Task 14 全量扫描发现）三篇的正文冗余 H1。提交 `d73c866` + `5d1b608`。

**验收**：21 篇文章 h1=1（全量扫描 bad=0）；重点 3 篇表格计数 ≥1、管道符段落 0、SEO 话术 0；乾卦 FAQ 以完整句收尾（"...attains supreme success."）；17 篇 fallback 文章 FAQ 以句号/省略号收尾。

### 5. 免费/Pro 权益说明

**基线（实现为准，未动后端）**：免费 3 次/24h、Pro 10 次/24h（`lib/rate-limit.ts:11,15`）、$4.99/月、三端点共享额度、滑动 24h 窗口。

**修改**：注册页 "unlimited wisdom" → "Join GoEast.ai — 3 free Oracle consultations every day"（`073e6fc`）。全代码 UI 扫描无其他 unlimited 用量声明（唯一剩余命中为 zhuangzi-butterfly-vr 文章中关于 VR 的哲学散文 "unlimited immersion"，非工具用量声明，按范围规则未动）。五处表述一致性核对（定价卡/注册副标/OracleCta 脚注/OracleOverlay 限额 UI/紫微与合盘 gate 及限额文案）全部 3 免费 / 10 Pro。紫微入口已说明：起盘免费无需账号、AI 解读需登录（3/天）或 Pro（10/天）；合盘入口：填表免费、AI 分析需登录。无文案-实现冲突需要确认；未动价格/续费/退款/既有订阅者权益。

### 6. Sitemap

4 页均满足收录条件（本地 200 + 自指 canonical + 无 noindex 头——逐页验证表见 Task 13 记录），加入 `app/sitemap.ts`：china-travel-guide（weekly 0.8）、chinese-philosophy-guide（weekly 0.8）、relocation-to-china（monthly 0.7）、/pricing（monthly 0.5）。提交 `2e727a5`。lastmod 沿用静态路由既有模式（部署时间）；未加登录/账户/参数化 URL（验证 sitemap 中 0 条）；未重新提交 GSC、未批量调 noindex。

---

## 二、自动化测试真实结果

| 命令 | 结果 |
|---|---|
| `npm test`（vitest，**本分支新建**，项目此前无测试框架） | **27/27 通过**（3 文件：auth-redirect 14、insights 6、text 7） |
| `npm run build` | **成功**（0 error；SSG 全量页面生成） |
| `npm run lint` | **35 problems（11 errors / 24 warnings）**——与 main 基线逐行对比确认**全部为存量问题**（行号漂移），本分支引入的 1 处 eslint-disable 错位已修复（`bde0a9e`），分支新增 lint 问题为 0 |
| `npx tsc --noEmit` | exit 0 |

依赖变更：+`remark-gfm@^4.0.1`（依赖）、+`vitest@^4.1.12`（devDependency；vitest@5 需 @types/node≥22 与项目 ^20 冲突，降版安装；期间 npm arborist 崩溃以 `--legacy-peer-deps` 恢复——后续安装如复现需同参数）。

## 三、验收记录摘要

**Metadata**：7 个关键页 + 全 sitemap 272 URL，canonical 计数全部 =1 且自指 www；synastry hreflang 正确；无重复/冲突标签（服务器 HTML 即最终渲染——这些页面为 SSG/服务端组件，浏览器渲染一致）。

**登录链路（静态 + 本地可达部分）**：`/pricing` → `/login?next=/pricing`（200）✓；非法输入 `?next=//evil.com` 登录页正常渲染、经校验器落 `/account`（14 个单测覆盖外链/协议相对/编码绕过/控制字符/登录循环/超长）✓；登录失败路径保留 next ✓。**动态往返（输入凭据登录）未执行**——见第六节。

**额度不重复扣减**：代码级（见第一节 2）+ 恢复路径零 API 调用审查确认。

**Oracle 上下文**：10 个入口页 CTA 映射表（第四节）逐一正确；alipay 无问卦 CTA。

**Sitemap**：4 个新 loc 存在；0 login/account。

**截图**：16 张（4 页 × 前/后 × 桌面 1440/手机 390），位于 `/tmp/goeast-shots/`（建议随 PR 归档）。前截图证实线上重复 H1 + 管道符表格；后截图证实单一 H1、无 SEO 小节。注：视觉模型对后截图中真实表格的描述有误（读成管道文本），以服务端 HTML 为准——`<table><thead><th>Dimension</th>…` 结构确凿，且 `h1=1`、管道符段落 0；视觉模型亦将标题 "Which" 误读为 "What"（前后两张同样误读，属小字号 OCR 误差）。

## 四、价格页 → 登录 → 返回购买入口 测试记录

已验证（无需凭据的部分）：
1. 未登录访问 `/pricing`：Pro 卡渲染 "Sign in to upgrade" → href `/login?next=/pricing`（服务端 HTML 抓取确认）✓
2. 登录页读取并校验 next；密码登录 `router.push(next)` 代码路径 ✓；OAuth/注册 redirectTo 携带 next ✓
3. 返回 /pricing 后购买按钮行为未变（`/api/checkout` 仅由显式点击触发；未自动提交/未重复建单——checkout 仅在点击处理器内调用一次）

**未执行**：真实/测试账号登录往返、Creem 测试模式下单、webhook 权益交付。原因与缺失项见第六节。"按钮存在"不作为支付验证通过的依据。

## 五、分支与提交

`main`(579ec64) → 21 个提交（清单见 `git log main..HEAD`，首提交为计划文档 `c4efdf5`，随后每任务 1-3 个小提交，含 6 个审查采纳修复）。**未 push origin、未合并 main、未部署生产**，等待审核。

**回滚方式**：
- 合并前：`git checkout main && git branch -D fix/week1-seo-login-oracle-content`
- 已合并未部署：`git revert <merge-commit> -m 1` 或重部署 main 上一提交
- 已部署：重新部署 main 既有产物（本分支无数据库迁移、无环境变量变更、无外部配置变更——回滚无需任何配套操作）

## 六、无法验证项 / 待确认 / 遗留问题

**无法本地验证（缺失条件）**：
1. **真实登录往返**：`.env.local` 指向的 Supabase 按生产实例对待——未创建测试账号（不自行修改生产认证数据）。需要：项目方提供的测试账号，或明确授权在 Supabase 创建一个。
2. **支付全链路（checkout/webhook/权益交付）**：`.env.local` 存在完整 CREEM_* 配置（4 键），判断为生产凭据。需要：Creem 测试模式 API key + 测试商品 ID + （可选）本地 webhook 隧道。在具备前不做任何真实/测试下单。
3. **部署时配置检查（重要）**：Supabase Auth 的 Redirect URLs 允许列表需覆盖带查询串的 `/auth/callback?next=…`（Supabase 按路径匹配，通常无需改动；若 OAuth 启动时报 redirect 不允许，需在 Supabase 控制台确认 `https://www.goeast.ai/auth/callback` 在列）。**未改动任何 Supabase/Creem 配置**。

**发现的既有问题（本轮未修，按"不修改无关内容"边界留档）**：
- `lib/rate-limit.ts` 内存 Map 计数：serverless 多实例不共享、重启清零（额度口径可能偏松）；webhook `expiresAt` 硬编码 +30 天而非订阅周期末；两者都涉及权益口径，需产品确认后再动。
- 其他 meta 描述 `.slice()` 截断（ziwei stars/palaces/combinations/patterns、glossary、daily-iching、llms-full.txt）——与已修复的 FAQ 截断同类，不在报告范围内。
- `content_zh` 管线未做 H1 剥离（当前 insights 页面不渲染中文正文，无实际影响；若上线双语阅读器需补）。
- Oracle "解锁 Pro" 按钮的登录往返后浮层为关闭态（问题草稿保留，需重开浮层再点）——UX 债，可与锚点联动一并优化。
- GSC "133 未索引" 中的 OpenGraph 图片 URL 为噪音，不按页面故障处理（按任务书口径）。

---

*报告完。等待审核；不自动合并 main、不自动生产发布。*
