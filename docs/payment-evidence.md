# Payment & Delivery Evidence — GoEast.ai

Status: **2026-10-22 22:30 CST** | Branch: `fix/launch-reliability` | Commit: `61a4e82` + late-event guard

## Verification Levels

| Symbol | Meaning |
|---|---|
| ✅ Code | 代码实现完成，通过编译 |
| ✅ Auto | 自动化测试通过（vitest mock） |
| ✅ Callback | 真实 Creem 回调到达并处理 |
| ✅ Preview | preview.goeast.ai 实际验证 |
| ✅ Prod | www.goeast.ai 实际验证 |
| ⏳ Pending | 需要条件/授权，尚未执行 |

## 1. Entitlement Logic

| Check | Code | Auto | Preview | Prod | Evidence |
|---|---|---|---|---|---|
| Free = 3/day, Pro = 10/day | ✅ | ✅ | ⏳ | ⏳ | `lib/rate-limit.ts` — `FREE_TIER_LIMIT=3`, `PRO_TIER_LIMIT=10` |
| **UTC 自然日重置**（非滑动 24h） | ✅ | ✅ | ⏳ | ⏳ | `getUtcWindowStart()` 以 UTC 日期为窗口键；PostgreSQL `increment_usage` 按天原子增量 |
| 跨功能共享额度（Oracle+紫微+合盘） | ✅ | ✅ | ⏳ | ⏳ | 三路由共用 `usage_log` 表 |
| `hasActiveProEntitlement` 含 expires_at + 48h 宽限 | ✅ | ✅ | ⏳ | ⏳ | `lib/creem.ts` 新增；7 个单测覆盖全场景 |
| ~~滑动 24h 窗口~~ | — | — | — | — | **已过时**：旧内存实现为滑动 24h；新实现为 UTC 自然日 |
| `expires_at` 只写不读 | — | — | — | — | **已过时**：门禁现在读取 `expires_at` + 48h 宽限期 |

## 2. Database Migration Status

| Object | SQL File Written | **Database Executed** | Verified |
|---|---|---|---|
| `usage_log` 表 | ✅ `supabase/migrations/002_*.sql` | ❌ **未执行** | `PGRST205` 错误确认表不存在 |
| `increment_usage` 函数 | ✅ `supabase/migrations/003_*.sql` | ❌ **未执行** | `PGRST202` 错误确认函数不存在 |
| RLS 策略（无 policy = 仅 service_role） | ✅ | ❌ | 同上 |

**待执行**: 在 Supabase Dashboard SQL 编辑器运行 `supabase/apply-migration.sql`
**影响**: 共享生产库新增表+函数，不影响现有表；无外键约束
**回滚**: `DROP FUNCTION increment_usage; DROP TABLE usage_log;`

## 3. Webhook Security

| Check | Code | Auto | Callback | Evidence |
|---|---|---|---|---|
| Fail-closed（无 secret → 500） | ✅ | ✅ | — | 路由 18-23 行 + 测试 |
| HMAC 验签（timingSafeEqual） | ✅ | ✅ | ✅ | Preview 真实 `subscription.canceled` 回调返回 200 |
| **迟到激活事件不重新开通已取消订阅** | ✅ | ✅ | ⏳ | `activateSubscription` 新增守卫：`cancelled/expired` 状态跳过激活（7 个单测覆盖） |
| 事件重放幂等 | ✅ | ✅ | — | upsert onConflict |
| Preview webhook URL | — | — | ✅ | `https://preview.goeast.ai/api/webhooks/creem` 已配置 |

## 4. Late Event Guard（本轮新增）

**已知风险场景**: 测试订阅 `sub_68Odn2mjNTHTZVlm4rUGvC` 已立即取消。Creem 计划在 10月23日 02:39 重试旧 `checkout.completed/paid`，02:45 重试旧 `canceled`。

**防护实现**: `lib/creem.ts` `activateSubscription()` 在 upsert 之前先查询当前状态。若为 `cancelled` 或 `expired`（终态），直接跳过并记录日志。`scheduled_cancel` 仍可转 `active`（正常续费场景）。

**测试**: `lib/__tests__/late-event-guard.test.ts` 7 个用例：
- 已取消 → 跳过激活 ✓
- 已过期 → 跳过激活 ✓
- 无记录 → 正常激活 ✓
- scheduled_cancel → 正常续费激活 ✓
- Webhook 路由对迟到 paid 返回 200（不报错，但守卫阻止实际激活）✓

**待验证**: 10月23日 02:39 后确认 Vercel 日志中该订阅未被重新激活。

## 5. Real Generation Status

| Environment | Status | Evidence |
|---|---|---|
| Preview (preview.goeast.ai) | ❌ **失败** — "Rate limit service unavailable" | 数据库迁移未执行，`increment_usage` 函数不存在 |
| Production (www.goeast.ai) | ⏳ 未测试 | 同一数据库，预期同样失败 |
| **修复后** | ⏳ | 执行迁移后需实际验证 |

## 6. Outstanding Items

| Item | Blocking | Next Step |
|---|---|---|
| 数据库迁移 | 无阻塞 | 用户在 Supabase Dashboard 执行 `supabase/apply-migration.sql` |
| Free 真实生成验证 | 数据库迁移 | 迁移后在 Preview 用测试账号提交合成问题 |
| Pro 真实生成验证 | 数据库迁移 + 测试账号 | 迁移后验证 deep 模式输出 |
| 完整 Test 支付闭环 | 需授权新的 Test 购买 | 账号 pcliu.fd@gmail.com 的订阅已取消，需新的测试购买 |
| 到期边界自动化测试 | 无阻塞 | 可通过修改 `expires_at` 在测试中模拟 |
| 迟到事件重试验证 | 无阻塞 | 等待 10月23日 02:39 后检查日志 |

---

*Updated: 2026-10-22 22:30 CST. Previous versions described the old in-memory rate limiter as "sliding 24h window" — this is obsolete. Current implementation uses UTC calendar-day windows with PostgreSQL atomic increment.*
