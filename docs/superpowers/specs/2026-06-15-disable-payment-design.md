# 支付功能临时禁用设计文档

**日期**: 2026-06-15  
**状态**: 待实施  
**原因**: Creem 账号需要调整，暂时禁用支付功能，显示 "Coming soon"

## 概述

临时禁用账户页面的升级按钮（新订阅入口），但保留现有订阅者的取消/恢复功能。使用环境变量控制，便于快速切换。

## 需求

### 功能需求
1. **禁用范围**：仅禁用升级按钮（用户无法发起新订阅）
2. **保留功能**：取消和恢复按钮正常工作（已有订阅者仍可管理）
3. **用户提示**：在升级按钮位置显示 "Coming soon" 消息
4. **配置机制**：通过环境变量控制，无需代码变更即可切换

### 非功能需求
1. **向后兼容**：环境变量未设置时默认启用支付功能
2. **安全性**：配置不暴露给客户端
3. **可维护性**：实现简单，符合现有代码模式

## 设计方案

### 1. 配置层

**环境变量**：
- `.env.example` 添加 `PAYMENT_ENABLED=true`（默认值）
- `.env.local` 设置 `PAYMENT_ENABLED=false`（本地测试）
- 生产环境通过 Vercel 环境变量控制

**类型定义**（`lib/types.ts`）：
```typescript
export interface SiteConfig {
  paymentEnabled: boolean;
}
```

**配置读取**（`lib/config.ts`）：
```typescript
import type { SiteConfig } from './types';

export function getSiteConfig(): SiteConfig {
  return {
    paymentEnabled: process.env.PAYMENT_ENABLED !== 'false',
  };
}
```

### 2. 后端逻辑（`app/account/page.tsx`）

**修改内容**：
- 导入 `getSiteConfig` 函数
- 在页面顶部读取配置：`const config = getSiteConfig()`
- 在订阅区域的条件渲染逻辑中：
  - 如果 `!config.paymentEnabled`，显示 "Coming soon" 消息
  - 否则，按现有逻辑显示 `UpgradeButton`、`CancelButton` 或 `ResumeButton`

**保持不变**：
- `CancelButton` 和 `ResumeButton` 的渲染逻辑
- `/api/checkout` 端点（保留作为后备）
- Webhook 处理逻辑
- Oracle API 的订阅检查

### 3. 前端 UI

**实现方式**：在 `app/account/page.tsx` 中直接内联渲染（无需单独组件）

**UI 代码**：
```tsx
{!config.paymentEnabled && (
  <div className="border-t border-sand pt-4">
    <div className="flex items-center gap-2 text-warm">
      <span className="text-sm">升级功能即将上线</span>
      <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">Coming soon</span>
    </div>
  </div>
)}
```

**视觉风格**：
- 使用 `border-sand`、`text-warm` 保持一致性
- "Coming soon" 徽章使用金色调色板
- 简洁不突兀

**国际化**：
- 中文文本："升级功能即将上线"
- 英文徽章："Coming soon"
- 与账户页面其他双语元素保持一致

### 4. 测试与上线

**本地测试**：
1. `.env.local` 设置 `PAYMENT_ENABLED=false`
2. 运行 `npm run dev`
3. 验证场景：
   - 未登录用户：重定向到登录页
   - 已登录无订阅：显示 "Coming soon"，无升级按钮
   - 已有活跃订阅：显示订阅状态 + 取消按钮
   - 已取消订阅：显示订阅状态 + 恢复按钮

**生产上线**：
1. Vercel 添加环境变量 `PAYMENT_ENABLED=false`
2. 重新部署
3. 验证账户页面显示 "Coming soon"

**恢复流程**：
1. 调整 Creem 账号后，环境变量改为 `PAYMENT_ENABLED=true`
2. 重新部署即可恢复升级功能

**回滚策略**：
- 通过修改 Vercel 环境变量快速回滚
- 无需代码变更，仅需重新部署

## 影响范围

### 修改文件
1. `lib/types.ts` - 添加 `SiteConfig` 类型
2. `lib/config.ts` - 新增配置文件
3. `app/account/page.tsx` - 添加配置检查和条件渲染
4. `.env.example` - 添加 `PAYMENT_ENABLED` 变量

### 不受影响
- `/api/checkout` 端点
- `/api/cancel-subscription` 端点
- `/api/resume-subscription` 端点
- `/api/webhooks/creem` 端点
- `/api/oracle` 端点
- `UpgradeButton`、`CancelButton`、`ResumeButton` 组件

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 环境变量未设置导致功能异常 | 默认值为 `true`（启用），向后兼容 |
| 现有订阅者无法管理订阅 | 仅禁用升级按钮，取消/恢复功能不受影响 |
| 恢复时需要代码变更 | 仅需修改环境变量，无需代码变更 |

## 成功标准

1. 账户页面无订阅用户看到 "Coming soon" 消息
2. 无升级按钮可点击
3. 已有订阅用户可正常使用取消/恢复功能
4. 环境变量切换后功能立即生效（重新部署）
5. Oracle API 的订阅检查正常工作

## 后续工作

1. 调整 Creem 账号配置
2. 测试支付流程
3. 将 `PAYMENT_ENABLED` 设为 `true` 恢复功能
