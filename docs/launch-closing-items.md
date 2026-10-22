# 推广前收口 — 三项待决

**日期**: 2026-10-22 | **分支**: `fix/launch-final-polish` (ad155cb)
**生产**: https://www.goeast.ai | **预览**: https://go-east-k7wacp4mw-pclius-projects-c305da2a.vercel.app

---

## ① 样例重新生成 ✅ 已完成

- **已重新生成**（2026-10-22T08:13:11，新时间戳）
- Traditional Teaching 现在只引用实际提供的卦辞/象辞，辞解释移至 AI Interpretation
- `lib/sample-reading.ts` 摘录已同步更新
- `/examples/iching-writing-habit` 线上已验证 200 OK，Markdown 正确渲染

---

##  真实支付 E2E 测试 ️ 阻塞中

**已有**:
- Mock 测试 100% 覆盖（签名/重放/取消/过期/链路）
- Checkout 路由测试（401/200/502/网络失败）
- Webhook fail-closed + timingSafeEqual

**需要（三选一）**:

| 方案 | 成本 | 时间 | 说明 |
|---|---|---|---|
| A) Creem 测试模式 | 免费 | 1-2h | 需 test-mode key + 测试商品 + 非生产 Supabase + webhook 隧道 |
| B) 跳过，标注"代码级验证" | 0 | 0 | 在定价页加"支付由 Creem 处理"链接，用户实际购买时自然验证 |
| C) 人工走一遍生产（小额） | ~$5 | 30min | 用真实账号购买→验证 Pro→立即取消→申请退款（Terms 允许 sole discretion） |

**建议**: 方案 B（最快上线）+ 方案 A（上线后补）

---

##  权益与额度保护 ⚠️ 需决策

### 3a. expires_at 门禁

**现状**: 订阅表有 `expires_at` 字段，但所有权益门禁只查 `status='active'`，不校验过期时间。若 Creem 未送达 `subscription.expired` 事件，访问无限延续。

**选项**:

| 方案 | 改动范围 | 风险 |
|---|---|---|
| A) 门禁加过期校验 + 48h 宽限期 | 改 4 个路由 + account 页 | 续费 webhook 延迟可能误锁付费用户（宽限期缓解） |
| B) 定时任务翻转过期行 | 新增 cron + 1 个脚本 | 依赖调度可靠性 |
| C) 暂不处理，监控 webhook 到达率 | 0 | 过期未取消的用户可能免费用 |

**建议**: 方案 A（48h 宽限期覆盖绝大多数 webhook 延迟场景）

### 3b. 额度存储

**现状**: 内存 Map，serverless 多实例不共享，重启清零。免费用户理论上可通过重启绕过 3 次限制。

**选项**:

| 方案 | 成本 | 改动 |
|---|---|---|
| A) 迁 Supabase | 免费（现有实例） | 改 rate-limit.ts 为 DB upsert |
| B) 迁 Upstash Redis | ~$10/月 | 改 rate-limit.ts 为 Redis incr |
| C) 暂不处理，监控滥用 | 0 | 依赖 24h 滑动窗口自然限制 |

**建议**: 方案 C（上线后观察，若发现滥用再迁）

---

## 附：小尾项状态

| 项 | 状态 |
|---|---|
| 价格页摘要显示字面 `**` | ✅ 已修复（examples 页用 ReactMarkdown，pricing 页摘录为纯文本无 `**`） |
| 学习模式按钮写 "Cast the Oracle" | ✅ 已修复（round 2.1 已改为 "Study the Hexagram"） |
| AI 解读需登录提示不够提前 | ️ 待处理 — 建议在 /iching 起卦结果页加"AI 解读需登录"提示（现只有按钮点击后才跳登录） |

---

## 推荐行动

1. **立即**: 合并 `fix/launch-final-polish` → main → deploy --prod（含重新生成的样例）
2. **上线后 24h 内**: 补方案 A（expires_at 门禁 +48h 宽限）
3. **上线后 1 周**: 观察额度滥用情况，决定是否需要迁存储
4. **可选**: 补 Creem 测试模式 E2E（非阻塞）

**不再扩展新功能，收口于此。**
