# Creem 测试模式支付与权益验证手册

状态：**未执行**（缺条件，见 §1）。本文档是 Round 2.1 交付的执行手册——条件齐备后按步骤操作并填写 §6 记录表，即可将 round2-report 中的 ❌ 未验证项转为 ✅/❌。
日期：2026-10-22

## 1. 前置条件（当前全部缺失）

| # | 条件 | 说明 |
|---|---|---|
| 1 | Creem 测试模式 API key + 测试商品 | `.env.example` 注明测试模式用 `CREEM_API_BASE=https://test-api.creem.io`；需在 Creem 控制台创建 test-mode 商品并取得其 product id。**生产 key 不可用于测试下单。** |
| 2 | 非生产 Supabase 项目（或指定测试账号） | webhook 与权益查询会写/读 `subscriptions`、`profiles` 表；测试不得写入生产库。最简做法：新建一个 Supabase 项目，跑 `supabase/schema.sql`，配置同样的 auth（Google OAuth 回调需加测试域名）。 |
| 3 | Webhook 隧道 | Creem 控制台把 webhook endpoint 指向可公网访问的本分支部署（推荐：先部署一个 Vercel preview，把 preview URL 填入 Creem test-mode webhook 设置；比本地隧道更接近生产路径）。 |
| 4 | 测试浏览器会话两个 | 账号 A（免费）、账号 B（将升级 Pro） |

环境变量清单（测试环境单独设置，不动生产）：`NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`（测试项目）、`CREEM_API_BASE=https://test-api.creem.io`、`CREEM_API_KEY`（test）、`CREEM_PRODUCT_ID`（test 商品）、`CREEM_WEBHOOK_SECRET`（test）、`AZURE_OPENAI_*`（可复用或测试 key）、`PAYMENT_ENABLED=true`。

## 2. 验证步骤

**S1 免费链路（账号 A）**
1. 注册/登录 A → `/pricing` 显示 "Sign in to upgrade"（未登录按钮不存在——已登录免费用户应显示 Upgrade 按钮）。
2. Oracle 咨询一次 → 成功；连续至第 4 次 → 期望 429 + "all 3 free consultations" 提示（UI 文案含 3 次/天）。
3. 第 4 次不产生解读流（观察页面无 [DONE]）。

**S2 购买（账号 B，测试模式）**
4. B 登录 → `/pricing` → Upgrade to Pro → 跳转 Creem 测试结账页（test-api 域名/test card 提示）。
5. 用 Creem 测试卡完成支付（Creem 文档的 test card 号码）。
6. **验收关键**：回到 `/account` 后不要以页面跳转判定成功——查 Supabase 测试库 `subscriptions` 表：应有 `status='active'`、`user_id=B`、`creem_subscription_id`、`expires_at` 取自事件字段（**顺带记录事件 payload 里的真实过期字段名**——代码按 `current_period_end_date|current_period_end|expires_at|expires_date` 顺序探测，确认真实字段后可简化）。
7. Vercel runtime logs（preview）应有一条 `{"event":"subscription_activated","subscription_id":"…"}`。

**S3 权益生效**
8. B 发起 Oracle 咨询 → 解读应包含 **DEEP READING MODE 的小节**（GOING DEEPER / REFLECTION / 邀请追问）且明显更长（~2×）。
9. B 紫微解读 → 应含 DECADES & TIMING（大限流年）与 PALACE INTERACTIONS（宫位互参）小节。
10. B 连续咨询至第 11 次 → 429 "(10/day)" 文案。

**S4 失败/取消/重放**
11. webhook 发送签名错误的事件（手动 curl 错误签名）→ 401，库无变化。
12. Creem 控制台重发（replay）同一 `checkout.completed` → 库中仍一行（upsert 幂等），日志出现第二条 activated（已知无害重复，event.id 去重为待决策项）。
13. 取消订阅（/account Cancel）→ Creem 发 `subscription.scheduled_cancel` → 库 `status='scheduled_cancel'` → B 仍有权益；等到期末（测试模式可加速）→ `subscription.expired` → 权益消失，429 文案回到免费口径。
14. 支付页中途放弃（关闭结账页）→ 库无行、无 activated 日志。

**S5 事件入库（VA 面板）**
15. 部署为 **production**（VA 仅生产收集）后重复 S2/S3，Vercel Analytics → Events 应出现 `upgrade_clicked`、`oracle_consult_started`、`oracle_reading_delivered`；Logs 出现 `subscription_activated`。对照 `docs/analytics-funnel.md` 漏斗。

## 3. 判定标准（不可用页面表现代替）

- 到账 = Supabase 行 + webhook 日志，**不是** success 页跳转。
- 扣次 = 服务端 429/成功流，不是前端按钮状态。
- Pro 输出差异 = 实际解读含 deep 小节 + 长度对比（可存两份输出样本）。
- 重复扣次检查：S3 中刷新/重试不增加已计次数（额度窗口内第 N 次失败重试仍计 1 次——这是现有规则：每次授权请求计 1 次；如需"失败不计数"需产品决策）。

## 4. 现有 mock 级证据（已具备，不需要测试模式）

- 签名/重放/取消/过期路由：`lib/__tests__/creem-webhook.test.ts`（15 用例）
- checkout 401/200/502/网络：`lib/__tests__/checkout-route.test.ts`
- deep 门控（free 字节级不变、paid 才有 addendum+双预算）：oracle/ziwei 路由与 prompt 测试
- 门禁谓词全状态矩阵：creem-webhook.test.ts "gate predicate" 用例

## 5. 已知限制（测试模式也验不了/需决策）

- `expires_at` 门禁不读取（待决策 ①）：S4-13 的"权益消失"依赖 Creem 主动发 expired 事件。
- /account 邮箱自认领（待决策 ②）：S2 中若 B 的邮箱与 A 行 customer_email 相同会串——测试时用不同邮箱。
- 内存额度计数：多实例/重启会清零——S3 的次数验证在单实例 preview 上有效，多实例行为不在本手册范围。

## 6. 执行记录（条件齐备后填写）

| 步骤 | 日期 | 结果 | 证据（行/日志/截图） | 备注 |
|---|---|---|---|---|
| S1.1–S1.3 | | | | |
| S2.4–S2.7 | | | | 真实过期字段名：____ |
| S3.8–S3.10 | | | | |
| S4.11–S4.14 | | | | |
| S5.15 | | | | |
