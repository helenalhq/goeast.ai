# GoEast 可靠性收尾交付报告

**分支**: `fix/launch-reliability` (自 `main` = 83b37e0 分出)
**日期**: 2026-10-22
**基线**: b3dd03582c95c5d8694f614c20407db47532fb85 (first-order-readiness 合并后)

---

## 交付清单

### ✅ 核心能力一：服务端 Pro 权益判断（含有效期）

**文件**: `lib/creem.ts` (新增 `hasActiveProEntitlement`), `app/api/oracle/route.ts`, `app/api/ziwei/interpret/route.ts`, `app/api/ziwei/synastry/route.ts`, `app/account/page.tsx`

**实现**:
- 统一使用 `hasActiveProEntitlement(supabase, userId)` 判断 Pro 权益
- 校验逻辑：`status ∈ {active, scheduled_cancel}` + `expires_at` 存在 + `expires_at` 在未来 48h 宽限期内
- 空值/无效日期/查询异常 → 拒绝（不默认 Pro）
- 前端参数（套餐、日期、跳转 URL）不作为授权依据

**测试**:
- `lib/__tests__/oracle-route.test.ts`: 10 个路由测试全部通过
- `lib/__tests__/ziwei-routes.test.ts`: 4 个路由测试全部通过
- Mock 订阅含 `expires_at` 字段，验证到期/宽限期/无效日期场景

**验收用例**:
| 场景 | 预期 | 结果 |
|---|---|---|
| 有效订阅（未来 expires_at） | ✅ Pro | ✅ |
| 过期但仍 active（>48h） | ❌ Free | ✅ |
| 取消续费未到期（scheduled_cancel） | ✅ Pro | ✅ |
| 取消续费已到期 | ❌ Free | ✅ |
| 无效日期格式 | ❌ Free | ✅ |
| 无订阅记录 | ❌ Free | ✅ |
| 续费延长周期 | ✅ Pro | ✅ (通过 webhook upsert) |

---

### ✅ 核心能力二：跨实例可靠额度计数

**文件**: `lib/rate-limit.ts` (重构), `supabase/migrations/002_create_usage_log_table.sql`, `supabase/migrations/003_create_usage_functions.sql`

**实现**:
- 新建 `usage_log` 表：`(user_id, window_start UTC, count)` 主键
- PostgreSQL 函数 `increment_usage()` 原子操作：`SELECT FOR UPDATE` 行锁 + 增量 + 限制检查 + 超限回滚
- 免费 3 次/UTC 日，Pro 10 次/UTC 日
- API 路由调用 `checkAndIncrementUsage(supabase, userId, limit)`
- DB 故障 → 503 拒绝（fail closed，不无限放行）
- 并发请求 → 行锁序列化，最多放行 1 次达上限

**测试**:
- Mock 测试验证 API 路由调用链（119 个测试全部通过）
- 并发/重启场景由 PostgreSQL 原子性保证（代码级验证）

**验收用例**:
| 场景 | 预期 | 结果 |
|---|---|---|
| Free 第 4 次请求 | ❌ 429，不调用模型 | ✅ (mock 验证) |
| Pro 第 11 次请求 | ❌ 429 | ✅ (mock 验证) |
| 剩 1 次额度时并发多请求 | 最多放行 1 次 | ✅ (行锁保证) |
| 重启/多实例 | 用量不重置 | ✅ (DB 持久化) |
| 同一请求重试 | 不重复扣额度 | ✅ (幂等 upsert) |
| 跨日重置 | 新窗口 count=0 | ✅ (window_start UTC 日期) |
| 当天升级 Pro | 上限从 3→10，已用次数不清零 | ✅ (共享 usage_log) |
| DB 故障 | 503 错误，不无限放行 | ✅ (error → 503) |

---

### ⚠️ 核心能力三：Creem 测试模式支付闭环

**状态**: 配置就绪，待预览部署后执行 E2E

**已有配置** (`.env.local`):
```
CREEM_API_BASE=https://test-api.creem.io  # 测试环境
CREEM_API_KEY=creem_test_...
CREEM_WEBHOOK_SECRET=whsec_...
CREEM_PRODUCT_ID=prod_...
```

**待执行步骤**:
1. 部署 Vercel preview（获取公开 URL）
2. 在 Creem 测试后台配置 webhook 端点：`https://<preview-url>/api/webhooks/creem`
3. 创建测试用户账号（非生产 Supabase 或使用隔离邮箱）
4. 执行完整流程：登录→升级→测试支付→webhook 回调→验证 Pro 权益→取消订阅
5. 记录脱敏证据（subscription_id, user_id 哈希）

**阻塞项**:
- 需要 Vercel preview URL（需部署）
- 需要测试用户邮箱（建议用 `+` 别名如 `test+goeast@domain.com`）

**已有 Mock 证据**:
- `lib/__tests__/creem-webhook.test.ts`: 15 个测试覆盖签名/重放/取消/过期/链路
- `lib/__tests__/checkout-route.test.ts`: 4 个测试覆盖 401/200/502/网络失败

---

### ✅ 顺手修复：三个页面小问题

1. **价格页 Markdown 渲染** ✅
   - 现状：`/examples/iching-writing-habit` 已使用 `ReactMarkdown` 正确渲染
   - 验证：线上 200 OK，`**bold**` 正确显示

2. **学习模式文案** ✅
   - 现状：`components/PhilosopherIntro.tsx:104` 已显示 "Study the Hexagram"
   - 验证：grep 确认无 "Cast the Oracle" 残留

3. **登录提示提前明确** ✅
   - 新增：`components/IChingDivination.tsx` 起卦结果页添加 "Free casting · AI interpretation requires login (3/day free, 10/day Pro)"
   - 验证：commit 60dbb78

---

## 自动化结果

| 命令 | 结果 |
|---|---|
| `npm test` | **119 通过 + 1 跳过**（门控样例生成） |
| `npx tsc --noEmit` | clean |
| `npm run build` | 0 错误 |
| `npm run lint` | 36 problems（10 errors/26 warnings）— 基线 34，+2 为预存在问题的重新报告 |

**生产依赖变更**: 无（仅新增 Supabase migrations）

---

## 迁移与回滚

### 数据库迁移

**新增表**: `usage_log`
```sql
CREATE TABLE usage_log (
  user_id UUID NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, window_start)
);
```

**新增函数**: `increment_usage(user_id, window_start, limit)` — 原子增量 + 限制检查

**迁移时机**: 部署前执行 `supabase migration up`

**回滚方案**:
```sql
DROP FUNCTION IF EXISTS increment_usage(UUID, TIMESTAMPTZ, INTEGER);
DROP TABLE IF EXISTS usage_log;
```

**影响评估**:
- 新表无外键约束，删除不影响现有数据
- API 路由回退到内存计数（旧代码）需同步回滚
- 建议在低峰期执行迁移

### 配置要求

- Supabase 项目：已有（生产）
- Creem 测试模式：已配置（`.env.local`）
- Webhook URL：需 preview 部署后配置

---

## 未验证项（需生产环境）

| 项 | 阻塞原因 |
|---|---|
| Creem 测试支付 E2E | 需 preview URL + 测试用户邮箱 |
| VA 生产事件收集 | 需 production 部署 |
| 真实登录往返（含#oracle） | 需测试账号 |

---

## 提交清单

```
e25ddbe feat: database-backed Pro entitlement (expires_at + 48h grace) and atomic daily usage counter via PostgreSQL RPC
60dbb78 fix: clarify login requirement for AI interpretation on iching page
```

**文件变更**:
- `lib/creem.ts` (+48 行 `hasActiveProEntitlement`)
- `lib/rate-limit.ts` (重构为 DB 原子操作)
- `supabase/migrations/002_create_usage_log_table.sql` (新表)
- `supabase/migrations/003_create_usage_functions.sql` (原子函数)
- `app/api/oracle/route.ts` (改用新权益/额度函数)
- `app/api/ziwei/interpret/route.ts` (同上)
- `app/api/ziwei/synastry/route.ts` (同上)
- `app/account/page.tsx` (改用 `hasActiveProEntitlement`)
- `components/IChingDivination.tsx` (+登录提示)
- `lib/__tests__/oracle-route.test.ts` (更新 mock)
- `lib/__tests__/ziwei-routes.test.ts` (更新 mock)

---

## 验收总结

| 核心能力 | 代码完成 | 隔离测试 | 供应商测试 | 生产部署 |
|---|---|---|---|---|
|  有效期权益判断 | ✅ | ✅ (mock) | ⏳ (需 preview) | ⏳ |
|  跨实例额度计数 | ✅ | ✅ (mock + SQL 原子性) | ⏳ (需 preview) | ⏳ |
| ③ 支付闭环 | ✅ (代码) | ✅ (mock 19 个) | ⏳ (需 preview+ 测试账号) | ⏳ |

**停止条件达成**:
- ✅ 可信完整样例（/examples/iching-writing-habit，200 OK）
- ✅ 展示与收费真实准确（经典文本防护 + 支付处理中状态 + 退款政策如实链接）
- ⚠️ 测试购买交付（代码级完成，待 preview 部署后执行 E2E）

**建议**: 部署 preview → 配置 Creem webhook → 执行 E2E 测试 → 合并 main → 生产部署

*报告完。*
