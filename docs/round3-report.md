# GoEast 第三轮交付报告 — 首单准备（Pro 购买交付验证 + 真实付费价值展示）

**分支**：`first-order-readiness`（自 `main` = a9c488d 分出，9 个提交；未合并、未部署生产）
**日期**：2026-10-22
**范围**：/iching、/pricing 及认证/支付/权益/解读链路；$4.99/月、模型、供应商、免费权益全部未动。

---

## 一、验收总表（通过 / 失败 / 未验证分开列）

### ✅ 已通过（本地可验证，均有证据）

| 项 | 证据 |
|---|---|
| 问题草稿与卦象一致的 24h 过期/清除规则 | `lib/draft.ts` seal/unsealTextDraft + 5 单测；与 iching-context 同规则（未来/NaN 时间戳拒绝） |
| 学习模式按钮/请求不声称投币 | PhilosopherIntro 检测学习上下文→按钮显示 "Study the Hexagram"（原 "Cast the Oracle"）；hexagram 页 "no coins needed"、prompt "did NOT cast. Do not invent changing lines" 维持 |
| **Free/Pro 同题真实样例** | `docs/samples/{free,pro}-reading.md` 完整原始输出 + `meta.json`（模型/token/时间戳/管线说明）。固定演示条件：恒卦(32)三爻变→解卦(40)（对照 lib/iching-data 验证 binary 翻转），同一问题，同一模型，经服务端同一纯函数管线（getOraclePrompt + buildIchingContextBlock + 路由常量温度/预算）。**明确标注为固定卦象演示，非两次随机起卦** |
| 样例质量核验 | 两份均引用正确卦象（测试断言 Hexagram 32/Heng）；传统引文带出处（卦辞/象辞/爻辞）；传统文本与 AI 解释分节明确；Pro 真实增量 = GOING DEEPER 第二视角 + 深度反思 3 问 + 追问邀请——**不是只写"字数翻倍"** |
| **发现并修复真实 bug**：deep 附录指令顺序 | 原：附录(先)被上下文块三段结构(后)覆盖→Pro 输出丢失 GOING DEEPER。修：base→上下文块→附录(最后)；路由测试新增顺序断言。**此 bug 影响线上所有"起卦+Pro"咨询** |
| /pricing 同题对照区（`#example`） | 两栏（手机堆叠）；演示条件声明；Free=问题+传统+解释+反思节选；Pro=仅新增部分（GOING DEEPER/深度反思/追问）；节选标注 + GitHub 完整输出链接；"Cast your own hexagram free →" 免费入口 |
| 升级按钮旁披露 | $4.99/月 · 自动续费 · Account 内随时取消 · Terms & refund policy 链接（Terms 实文：退款 sole discretion——按钮区不发明政策）· 税费结账时计算 |
| /iching 查看入口 | 起卦工具下方 "See a real Free vs Pro example →" → /pricing#example；免费流程零改动 |
| /account 支付处理中状态 | `?checkout=success`（checkout success_url 已带）+ 无权益 → 琥珀色"从结账返回——确认订阅中…勿重复支付"卡片（替代升级按钮）+ PendingRefresher 5s 刷新、3 分钟硬停；**权益判定仍仅来自 webhook 写入的 DB**，URL 参数纯展示；无自动重新结账 |
| 首单五步漏斗可区分 | ① `iching_cast_completed`（客户端）② `pricing_example_viewed`/`upgrade_clicked`（客户端）③ **`checkout_created`（服务端日志，本轮新增）** ④ `subscription_activated`（服务端）⑤ `oracle_reading_delivered`（客户端 [DONE]）。客户端事件自动带 `env` 属性（production/preview/development）——测试与真实流量可分 |
| 防重复计数 | 点击守卫 + [DONE] 单次 + ref 守卫 + newsletter 仅新增（沿用 R2.1 语义） |
| 隐私 | 事件仅标量+枚举；日志仅 user_id/subscription_id（无邮箱/问题/卦象/命盘） |

### ❌ 已知失败/缺陷
（无——本轮无失败项）

### ⏳ 未验证（需条件，不做假验证）

| 项 | 缺什么 | 手册位置 |
|---|---|---|
| 测试购买→回调→Pro 权益→高级解读（端到端） | Creem test-mode key/商品、非生产 Supabase、webhook 指向、测试账号 | `docs/payment-test-plan.md` S1–S5 + **S6 首单链路（新增 6 步）** |
| 真实登录往返（含 #oracle 回到进行中咨询） | 测试账号 | 同上 S1 |
| 取消订阅→期末权益变化 | 测试环境 | S4-13 |
| VA Events 面板真实出现事件 | production 部署（VA 仅生产收集） | S5-15 |
| 样例经 UI（登录态）生成 | 本轮样例经服务端同一管线脚本生成（非 UI 端到端）；`npm test` 默认跳过（RUN_SAMPLE_GENERATION=1 门控），不产生费用 | meta.json "transport" 字段如实记录唯一差异（非流式以捕获 usage） |

## 二、成本记录（第七节要求）

| 项 | 值 |
|---|---|
| 模型 | `gpt-5.4-mini`（AZURE_OPENAI_MODEL，Azure OpenAI） |
| Free 样例 | prompt 770 + completion 563 = 1,333 tokens（TTFT 432ms，全程 ~3.5s） |
| Pro 样例 | prompt 874 + completion 872 = 1,746 tokens（全程 ~5.8s） |
| 调用次数 | 3 次（首次 Pro 因指令顺序 bug 缺 GOING DEEPER 作废重生成 1 次；作废输出已覆盖） |
| 费用 | **估算**：按该模型级别公开牌价（输入/输出每 1M token 约 $0.2–0.6 量级），3 次调用合计 **< $0.01**（精确账单在 Azure 控制台，标为估算） |
| 额度执行 | 免费 3/24h、Pro 10/24h（滑动窗口，服务端内存计数——多实例不共享/重启清零为已知限制，待决策⑥） |
| 请求防护 | question ≤500 字符（400）；philosopher 白名单；ichingContext 严格校验（数字范围/去重/丢弃未知字段）；无每分钟级 rate-limit（滥用防护薄弱——**成本风险上报**：单账号 24h 上限即硬顶，但多账号 IP 维度仅免费层有指纹，建议下轮评估 Upstash/DB 级限流，未擅自改动） |

## 三、执行记录摘要（第三节"先验证购买交付"的处置）

- 服务端权限判定：三端点权益仅由 DB 订阅行（webhook 写入）判定——`checkout_created`/`?checkout=success` 均为展示层，无法开通权益（代码级核验 + 路由测试）。
- 重复回调：upsert 幂等 + 测试覆盖重放；失败/取消支付不触达 activate（签名/fail-closed 测试矩阵）。
- 回调延迟：本轮新增真实处理中状态 + 自动恢复（不重复购买）。
- 登录前后卦象/问题一致：A6 脚本 13/13（round 2.1）+ 本轮 T2/T3 未改变该路径；**真实登录后回跳仍未验证（测试账号缺失）**。
- 解读失败/超时/重复点击：失败流不发 delivered、不退额度的现状如实记录（失败会计入次数为现有规则——如需"失败不计数"属产品决策，未擅改）。
- 取消入口：/account Cancel/Resume 按钮在（scheduled_cancel 文案 "Cancels at period end" 与行为一致）；端到端验证待测试环境。

## 四、自动化结果（真实执行）

| 命令 | 结果 |
|---|---|
| `npm test` | **118 通过 + 1 跳过**（门控样例生成；门控开启时 119/119） |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 34 问题（=基线，本轮新增 0） |
| `npm run build` | 0 错误 |

生产依赖零变更（无新增 devDep）。

## 五、修改清单与提交（9 个）

| Commit | 内容 |
|---|---|
| `d71b11a` | 问题草稿 24h 信封过期（T2） |
| `e4ac10e`+`955b947` | 学习模式按钮文案 + lint 收尾（T3） |
| `0127ca3` | **真实样例生成 + deep 附录顺序 bug 修复**（T4，含门控脚本与 docs/samples） |
| `6ba1f87` | pricing 对照区 + iching 入口 + env 标记（T5） |
| `2753e58` | 节选省略标记/链接合并/命名一致（T5 审查修复） |
| `396e1c4` | /account 处理中状态 + 自动恢复（T6） |
| `dfb70fd` | 处理中措辞诚实化（T6 审查修复） |
| `86bcdb4` | checkout_created 服务端日志 + 手册 S6（T7） |

文件：`lib/draft.ts`、`lib/sample-reading.ts`（新）、`lib/analytics.ts`、`lib/__tests__/*`（+8 测试）、`components/PhilosopherIntro.tsx`、`components/OracleOverlay.tsx`、`app/api/oracle/route.ts`、`app/api/checkout/route.ts`、`app/pricing/*`（+example-viewed.tsx）、`app/iching/page.tsx`、`app/account/*`（+pending-refresher.tsx）、`docs/samples/*`（新）、`docs/analytics-funnel.md`、`docs/payment-test-plan.md`、`scripts/acceptance/generate-sample.test.ts`（新）。

## 六、预览与回滚

- **预览地址**：见下方"Preview 部署"记录（Vercel preview URL，非生产）。
- **回滚**：合并前 `git checkout main && git branch -D first-order-readiness`；合并后 `git revert <merge> -m 1`。无 DB 迁移/环境变量变更（复用既有 AZURE/CREEM/SUPABASE 配置）。样例生成门控默认跳过，回滚后无任何运行时副作用。
- 回归保障：deep 顺序修复有路由测试钉住；免费输出仍字节级不变（既有测试）。

## 七、截图归档

`/tmp/goeast-shots-round3/`：pricing 对照区桌面/手机（1440/390×4200）、/iching 入口桌面/手机。手机端检查记录：对照区单列堆叠、text-xs 可读、break-words 无溢出（截图可核）。

## 八、待 owner 事项

1. 上轮 6 项业务决策仍未决（expires_at 门禁、邮箱自认领、event.id 去重、退订、欢迎邮件、额度存储）——其中滥用防护薄弱（成本风险）建议提级。
2. 测试模式 4 项前置条件（`docs/payment-test-plan.md` §1）——齐备后执行 S1–S6，把本报告 ⏳ 项转为 ✅/❌。
3. 若样例需换问题/卦象：`RUN_SAMPLE_GENERATION=1 npx vitest run scripts/acceptance/generate-sample.test.ts`（改脚本内 QUESTION/CAST 常量），会重写 docs/samples 并需同步 lib/sample-reading.ts 节选。

*报告完。未合并、未部署生产，等待审核。*
