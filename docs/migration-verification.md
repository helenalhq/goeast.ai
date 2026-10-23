# 数据库迁移与额度服务验证报告

**执行时间**: 2026-10-23 08:23 CST
**数据库**: Supabase vdmpcrgpvjeuozbalbpt（共享生产）
**执行人**: Owner 手动执行（方式 B — Dashboard SQL Editor）
**迁移脚本**: `supabase/apply-migration.sql`

---

## 一、迁移执行结果

### 创建的对象

| 对象 | 状态 | 验证方式 |
|---|---|---|
| `usage_log` 表 | ✅ 存在 | `GET /rest/v1/usage_log` 返回 `[]` |
| `increment_usage` 函数 | ✅ 存在 | RPC 调用返回 `{"allowed":true,...}` |
| `idx_usage_log_window` 索引 | ✅ 存在 | 函数查询正常 |
| RLS 启用（无 policy） | ✅ 生效 | anon key 读取返回 `[]`（不可见），写入返回 `42501` 拒绝 |

### 安全核验

| 检查项 | 结果 | 证据 |
|---|---|---|
| anon key 读取 usage_log | ✅ 空结果 | RLS 无 policy = 非 service_role 不可见 |
| anon key 写入 usage_log | ✅ 拒绝 | `42501: new row violates row-level security policy` |
| SECURITY DEFINER | ✅ | 函数声明包含 |
| search_path 固定 | ✅ | `SET search_path = public, pg_temp` |
| PUBLIC/anon 执行权限 | ✅ 已撤销 | `REVOKE FROM PUBLIC, anon` |
| service_role 执行权限 | ✅ 已授予 | RPC 调用成功 |

---

## 二、额度服务功能验证

### Free 上限测试（limit=3, UTC 2026-10-23）

| 调用 | 结果 |
|---|---|
| 第 1 次 | `{"allowed":true,"remaining":2,"currentCount":1}` |
| 第 2 次 | `{"allowed":true,"remaining":1,"currentCount":2}` |
| 第 3 次 | `{"allowed":true,"remaining":0,"currentCount":3}` |
| 第 4 次 | `{"allowed":false,"reason":"limit_exceeded","currentCount":3}` ✅ 拒绝 |

### Pro 上限测试（limit=10, UTC 2026-10-23）

| 调用 | 结果 |
|---|---|
| 第 1-10 次 | 全部 allowed=true, remaining 递减至 0 |
| 第 11 次 | `allowed=false` ✅ 拒绝 |

### 跨日重置测试

| 窗口 | 结果 |
|---|---|
| 2026-10-23（今日） | count=3（已达上限） |
| 2026-10-22（昨日） | count=1, remaining=2 ✅ 新窗口从 0 开始 |

### 原子性

PostgreSQL `SELECT FOR UPDATE` 行级锁保证并发安全——已通过函数设计验证。

**测试数据已全部清理**（DELETE 3 个测试用户，确认表为空 `[]`）。

---

## 三、迟到事件重试验证

### 已知风险场景

测试订阅 `sub_68Odn2mjNTHTZVlm4rUGvC`（pcliu.fd@gmail.com）已于 2026-10-22 立即取消。Creem 计划重试：
- 北京时间 10/23 02:39 — 旧 `checkout.completed/paid` 重试
- 北京时间 10/23 02:45 — 旧 `canceled` 重试

### 验证结果（2026-10-23 08:23 CST 查询）

```json
{
  "creem_subscription_id": "sub_68Odn2mjNTHTZVlm4rUGvC",
  "status": "cancelled",  ← 未被旧 paid 事件重新激活 ✅
  "expires_at": "2026-11-22T12:02:41",
  "updated_at": "2026-10-22T18:46:00 UTC" (= 北京时间 02:46)
}
```

**结论**: 订阅保持 `cancelled` 状态。旧 paid 重试（02:39）未改变状态，旧 canceled 重试（02:45→02:46）最终确认了取消。迟到事件防护有效。

**代码级防护**: `lib/creem.ts` `activateSubscription()` 包含终态守卫——`cancelled/expired` 状态跳过激活（7 个单测覆盖，commit d336257）。

---

## 四、Preview 状态

| 检查项 | 结果 |
|---|---|
| `https://preview.goeast.ai/` | 200 ✅ |
| `https://preview.goeast.ai/iching` | 200 ✅ |
| `/api/oracle`（未登录） | 401 LOGIN_REQUIRED ✅ |
| 额度服务 | ✅ 数据库端正常（之前 503 已修复） |

**下一步**: 用测试账号在 Preview 提交合成问题，验证端到端生成 + 额度扣减。

---

## 五、回滚方案

如需回退：
```sql
DROP FUNCTION IF EXISTS increment_usage(UUID, TIMESTAMPTZ, INTEGER);
DROP TABLE IF EXISTS usage_log;
```

代码回退：`git revert d336257`（恢复旧内存计数）。

---

*报告完。2026-10-23 08:23 CST。*
