# GoEast 第二轮交付报告 — 咨询转化链路与权益验证

**分支**：`feat/round2-consultation-flow`（自 `main` = f91fb85 分出，24 个提交；未 push、未合并、未部署）
**日期**：2026-10-22
**计划**：`docs/superpowers/plans/2026-10-21-round2-consultation-entitlements.md`（每任务经实现 + 规格审查 + 质量审查两阶段评审，关键安全问题多轮加固）

---

## 一、验收总表

| 任务 | 验收项 | 状态 | 证据 |
|---|---|---|---|
| **P0-1 同一卦连续咨询** | 游客起卦→输入问题→（登录）→原卦解读 | ✅（本地交互级） | A6 脚本 12/12（真实随机起出归妹卦 54，变爻 1,5 → 之卦 47，卡片显示与跳转全链路） |
| | 登录失败/取消后草稿可恢复 | ⚠️ 部分（代码级；**真实登录往返未验证**——需测试账号） | R2.1 后：#oracle 锚点保留+自动开框（交互实测）；登录后返回进行中咨询待测试账号（手册 S1/S3） |
| | 刷新/重试不重复扣次 | ✅ | 恢复路径零 API 调用；consult 仅显式点击；额度仅服务端对已授权请求计数（路由测试断言 401/429 不触模型） |
| | 不同咨询不串上下文 | ✅（R2.1 修复后实测） | 初版缺陷：旧问题按人物键保留、配给新卦——R2.1 起：工具入口=开始新咨询（清旧问题+信封 24h 过期）；直接打开=继续上次（headless 实测 PASS） |
| | 不虚构变爻（固定卦页学习模式） | ✅ | `mode:"study"` prompt 明令 "did NOT cast. Do not invent changing lines"；UI 标"学习此卦" |
| | 传统文本/AI 解释/反思建议区分 + 不宣称必然/不恐吓 | ✅ | prompt 三段结构 + "never a prediction…never a reason to fear, and never a reason to pay"；卡片免责行 |
| | 隐私：问题/排盘不进 URL、埋点、日志 | ✅ | 上下文仅数字（服务端解析卦名防注入，测试断言注入字符串不可达 prompt）；`loginUrlWithNext` 仅 pathname；埋点封装结构性拒绝非标量 |
| | 桌面/手机证据 | ✅ | `/tmp/goeast-shots-round2/` 7 张（上下文卡片桌面/手机、登录跳转、学习模式、定价块）+ `scripts/acceptance/` 可复跑脚本 |
| **P0-2 收费链路** | Free/Pro 差异及重置规则清单 | ✅ | `docs/entitlements.md`（含与实现的逐项对照） |
| | **实现真实 Pro 差异**（你的决策） | ✅ | Oracle/紫微/合盘三端点 deep 模式：附加小节 + ~2× token 预算；免费输出字节级不变（测试钉死） |
| | 统一 Pricing/工具页/耗尽提示 | ✅ | 五处表面一致；残留 "Deep Features"/"extended sessions"/"Priority access" 清零（HTML grep 0） |
| | 免费示例 vs Pro 示例（忠实） | ✅ | Pricing "What a Pro reading adds" 对比块（结构/长度规格对比，无编造样本）；审查修正 3 处夸大（免费反思问题范围、词数区间、"deep features" 措辞） |
| | 登录回跳/权限/扣次/失败/重复点击/回调重放测试 | ✅（mock 级） | 99 个测试：webhook 15（签名/重放/取消/过期/链路）、checkout 4（401/200/502/网络）、oracle 路由 10、newsletter 9 |
| | 测试支付→回调→升级→权益 | ❌ **未验证** | `.env.local` 为生产凭据；需 Creem test-mode key + 测试商品 + 非生产 Supabase 账号 + webhook 隧道（`docs/entitlements.md` 详列）。**未发生任何真实扣款；成功页跳转未被当作到账凭据** |
| **P0-3 邮件真实** | 频率/500+/PDF/Save Your Chart/收件箱承诺 | ✅ 全部移除或真实化 | 6 调用点 + 组件默认 + API 响应；全站 grep 0；成功文案 "Subscribed — you're on the list."（存储真实） |
| | 哲学/易经页不推旅行赠品 | ✅ | leadMagnet 默认移除，无任何调用点传递 |
| | 保存/发送/失败/退订验证 | 部分 | 保存/失败路径 9 个 mock 测试；**发送与退订无实现可验**（无发送器；政策对退订完全沉默——见第六节待决策）；未用真实邮箱写生产库 |
| **P1-1 四篇文章** | 微信支付 | ✅ | 官方限额（单笔 ¥6,500/年 ¥65,000，WeChat 帮助中心）替换错误 ¥20k/年；删 Google Voice 建议；官方新闻室证实外卡不能充零钱；6 个 /skills/ 链接替换；Sources 附录 |
| | eSIM | ✅ | 新增"路由与实际可用性"小节（Airalo 帮助中心/Apple 支持），区分漫游 eSIM vs 大陆 IP；删 2 个 /skills/ 链接 |
| | 外卖 | ✅ | "Address precision is the" takeaway 收紧为完整句；平台/登录/支付措辞按来源核实软化；删无来源"5 亿用户"；退换货表述去绝对化 |
| | 无为 | ✅ | 3 个 FAQ 重写去重（增加新角度而非复述正文）；概念/应用标题区分（2 个 H2 中英同步）；老子入口链接完好 |
| | 每项时效事实附来源+核验日期；正文/摘要/FAQ/结构化同步 | ✅ | 3 篇 Sources 附录（checked 2026-10-22）；FAQ 与正文同步；`published_at` 更新 |
| | 回归检查 + 首页措辞 | ✅ | `content-regression.test.ts` 6 项（黑名单词/无 skills 链接/takeaway 完整/FAQ 去重/日期与来源/首页措辞）；"optimized landing guides" 移除 |
| **P1-2 埋点** | 检查现有 VA，不重复安装 | ✅ | SDK 已装、CSP 已允许、零重复安装 |
| | 最小事件集 + 服务端支付确认 | ✅ | 12 个事件接线（见 `docs/analytics-funnel.md`）；支付确认=webhook 结构化日志（仅 subscription_id） |
| | 重试不重复计数 | ✅（语义经 R2.1 修正） | newsletter 仅新增计数；登录拆分 viewed/succeeded（OAuth 回调为已知盲区）；支付确认/交付/入库证据见 docs/payment-test-plan.md §4-§5 |
| | 无 PII | ✅ | 封装结构性拒绝非标量（单测）；事件数据仅枚举串/布尔/计数 |
| | 一次测试流程事件证据 | ✅ | headless 浏览器实测捕获 4 事件（cast/oracle_opened×2 dev 严格模式/chart）；consult/delivered 需登录（测试账号缺失，未验） |

## 二、自动化结果（真实执行）

| 命令 | 结果 |
|---|---|
| `npm test` | **99/99 通过**（13 文件；第一轮基线 27 → +72：iching-context 14、oracle-prompts 3、oracle-route 10、ziwei 6、webhook 15、checkout 4、newsletter 9、analytics 5、content-regression 6 等） |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | 成功（0 错误） |
| `npm run lint` | **34 问题（10 errors/24 warnings）＜ 基线 35**——本轮新增为 0，顺带修复 1 个存量 error |

依赖变更：+`playwright-core`（devDependency，验收脚本驱动缓存 chromium，无浏览器下载）。生产依赖零变更。

## 三、关键设计决策（可审查）

1. **卦象上下文仅传数字**（hexagramNumber/changingLines/transformedNumber）；卦名由服务端从自有数据解析 → 客户端字符串结构性无法注入 prompt（测试断言）。prompt 块含 OVERRIDE 行，覆盖 Zhou Gong 基础 prompt 里 "You may cast a hexagram" 的旧指令（模型此前会自行编卦）。
2. **Pro 差异=DEEP 模式**（你的决策"实现真实差异"）：附加小节（Going Deeper/反思追问/大限流年/宫位互参）+ 预算 ×2（Oracle maxWords×2、紫微 3000→6000、合盘 4000→8000）。免费输出字节级不变。价格、额度（3/10）、状态判定、退订规则均未动。
3. **Webhook fail-closed**：无 secret → 500 拒绝（Creem 会重试，secret 配好后自动恢复）；签名比较升级 timingSafeEqual；过期时间优先事件字段（4 个候选名 + 未来校验 + 30 天回退——真实字段名待 test-mode 确认）。
4. 上下文清除四路：咨询成功、卡片 ✕、重新起卦、关标签页（sessionStorage 特性）。

## 四、第一轮成果回归确认

- synastry canonical 自指 ✓（HTML 验收）；sitemap 4 入口仍在 ✓；insights 渲染（单 H1/表格/clipText）被 99 测试与 D5 回归覆盖 ✓；登录返回链路在 A6 流程中实测 ✓（`/login?next=%2Fsophies-journey%2Fprologue-zhougong`）。

## 五、仍需你决策的业务规则（未替你猜）

1. **`expires_at` 只写不读**：所有权益门禁只查 status，不校验过期时间。若 Creem 未送达 `subscription.expired` 事件，过期订阅访问无限延续。选项：A) 门禁加过期校验+宽限期（如 48h，防续费 webhook 延迟误锁付费用户）——推荐；B) 定时任务翻转过期行。两者都改变权益行为，需你批准。
2. **/account 邮箱自认领**：任何账号邮箱与订阅 customer_email 相同即自动认领订阅（无所有权验证）。建议加一次性令牌或至少仅 metadata.userId 认领。
3. **Webhook 事件 ID 去重**：upsert 已幂等（无重复记账），但"取消后重放激活事件"会重新开通（需持有有效签名，风险低）。可加 event.id 唯一约束。
4. **退订机制**：政策完全未提及邮件退订；DB 有 status 字段但无退订端点。选项：A) 政策加"联系我们退订"（零代码）；B) 最小退订路由。
5. **欢迎邮件/PDF 赠品**：本轮按你的决策纯文案真实化；若要恢复任何邮件承诺需先建发送器（Resend 域验证）+ 测试邮箱。
6. **额度存储迁移**：内存 Map 在 serverless 多实例间不共享、重启清零（额度偏松）。迁 Supabase/Upstash 属基础设施变更。

## 六、未验证清单（及所需条件）

| 项 | 需要 |
|---|---|
| 真实账号登录→咨询→扣次往返 | 测试账号（生产 Supabase 不可自行建号） |
| 真实登录后 oracle_consult/delivered 事件 | 同上（VA 生产部署后可在 Events 面板看） |
| Creem 测试模式支付全链路 | test-mode key + 测试商品 + 非生产 Supabase + webhook 隧道 |
| Creem 过期字段名确认 | 同上（代码已做多候选+回退） |
| newsletter_subscribed 真实事件 | 需向生产库写入一行（未执行）；mock 测试覆盖路由行为 |
| 移动端触屏实测 | 截图已拍（390px）；真机点击体验未测 |

## 七、分支与回滚

- 提交清单：`git log main..HEAD`（24 个：A1-A6 ×7、B1-B4 ×6、C1-C2 ×2、D1-D5 ×6、E1-E4 ×4、F 报告，含 8 个审查采纳修复）。
- 回滚：合并前 `git checkout main && git branch -D feat/round2-consultation-flow`；合并后 `git revert <merge> -m 1`。**无数据库迁移、无环境变量变更、无外部配置变更**——回滚无需配套操作。free 用户输出与本轮之前逐字节相同，回滚无用户可见副作用（Pro deep 模式消失除外）。
- 未 push origin；不自动合并、不自动部署生产，等待审核。

## 八、证据归档

- 交互验收脚本（可复跑）：`scripts/acceptance/a6-p0-1-consultation-flow.mjs`（12/12）、`scripts/acceptance/e4-analytics-evidence.mjs`（4 事件）
- 截图：`/tmp/goeast-shots-round2/`（7 张：上下文卡片桌面/手机、登录跳转、学习模式、定价块桌面/手机、乾卦学习 CTA）
- 权益对照：`docs/entitlements.md`；漏斗说明：`docs/analytics-funnel.md`

## 九、Round 2.1 收尾（2026-10-22，owner 验收反馈修复）

分支 `fix/round2-1-review-fixes`（10 个提交）。逐项对应验收反馈：

| 反馈 | 修复 | 验证 |
|---|---|---|
| P0 旧问题混入新咨询 | 工具入口（起卦/学习）=开始新咨询：清旧问题草稿+写入带 savedAt 的信封；直接打开 Consult=继续上次；上下文 24h 过期+防篡改（未来/NaN 时间戳拒绝） | headless 交互实测：旧问题清空✓ 学习卡片✓ 信封存储✓ 重载恢复✓；+8 单测 |
| P0 登录恢复不完整 | loginUrlWithNext 保留 #oracle 锚点；#oracle 深链/回跳自动打开咨询框 | 重载自动开框实测 PASS；**真实登录往返仍未验证**（需测试账号，手册 S1） |
| eSIM FAQ 与正文矛盾 | 中英 FAQ 重写为路由两态（漫游可用/大陆IP受限），JSON-LD 同源同步 | grep 无 "still need a VPN" 残留 |
| 外卖摘要残句（根因） | 提取规则修复：meta description 经 clipText 155 字符句边界预算（含 JSON-LD Article.description 同步） | 全部文章 description 以完整句收尾（回归测试钉住） |
| wechat 限额缺适用条件/转账混淆 | 限额限定"外卡+国际版账户"，中国卡用户另述；4 处转账表述改为"余额/中国卡功能，外卡仅商户消费"；Wise 二源印证限额与不可转账 | grep 无 transfer 混淆残留 |
| 无为双 FAQ | body FAQ 小节删除，1 个高价值问题并入 frontmatter（现 4 问一套）；站点级回归测试新增"双 FAQ 禁止"（又抓出并修复 wechat-pay、yin-yang-explained 两篇） | 测试 110/110 |
| alipay 及其他文章 skill 导流 | 站点级清理：11 个 /skills/ 链接/5 篇文章全部替换为真实指南页；回归测试站点级禁止 | `grep /skills/ content/insights` = 0 |
| 埋点语义 | newsletter_subscribed 仅新增；login 拆 login_page_viewed_with_target（浏览）/ login_succeeded（密码登录成功，OAuth=已知盲区）；漏斗文档同步 | grep 旧事件名 0 残留 |
| 测试模式验证 | `docs/payment-test-plan.md`：前置条件/15 步流程/判定标准（页面表现不作数）/执行记录表 | 待条件齐备执行 |

**自动化**：110/110 测试、tsc clean、lint 34≤基线、build 0 错误。

*报告完。等待审核。*
