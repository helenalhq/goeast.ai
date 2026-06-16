# 支付功能临时禁用实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 临时禁用账户页面的升级按钮，显示 "Coming soon" 消息，使用环境变量控制开关。

**Architecture:** 在服务端组件中读取环境变量配置，根据配置条件渲染升级按钮或 "Coming soon" 消息。配置不暴露给客户端，现有订阅管理功能不受影响。

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, 环境变量

---

## 文件结构

**新增文件：**
- `lib/config.ts` - 站点配置读取，提供类型安全的配置访问

**修改文件：**
- `lib/types.ts` - 添加 `SiteConfig` 接口定义
- `app/account/page.tsx` - 添加配置检查和条件渲染逻辑
- `.env.example` - 添加 `PAYMENT_ENABLED` 环境变量说明

---

### Task 1: 添加 SiteConfig 类型定义

**Files:**
- Modify: `lib/types.ts:239` (文件末尾)

- [ ] **Step 1: 在 lib/types.ts 末尾添加 SiteConfig 接口**

```typescript
export interface SiteConfig {
  paymentEnabled: boolean;
}
```

- [ ] **Step 2: 验证类型定义无语法错误**

Run: `npm run lint`
Expected: 无错误输出

- [ ] **Step 3: 提交类型定义**

```bash
git add lib/types.ts
git commit -m "feat: add SiteConfig type definition"
```

---

### Task 2: 创建配置读取模块

**Files:**
- Create: `lib/config.ts`

- [ ] **Step 1: 创建 lib/config.ts 文件**

```typescript
import type { SiteConfig } from './types';

export function getSiteConfig(): SiteConfig {
  return {
    paymentEnabled: process.env.PAYMENT_ENABLED !== 'false',
  };
}
```

**说明：**
- 默认值为 `true`（当环境变量未设置或设置为非 `'false'` 值时）
- 仅在环境变量明确设置为 `'false'` 时禁用支付功能
- 向后兼容，不影响现有部署

- [ ] **Step 2: 验证模块无语法错误**

Run: `npm run lint`
Expected: 无错误输出

- [ ] **Step 3: 提交配置模块**

```bash
git add lib/config.ts
git commit -m "feat: add site config module with payment toggle"
```

---

### Task 3: 更新环境变量示例文件

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: 在 .env.example 末尾添加 PAYMENT_ENABLED 变量**

在文件末尾（Creem Payment 部分之后）添加：

```bash
# Feature Flags
PAYMENT_ENABLED=true  # Set to 'false' to disable payment UI (shows "Coming soon")
```

**说明：**
- 默认值为 `true`，保持向后兼容
- 注释说明如何禁用以及禁用后的效果

- [ ] **Step 2: 提交环境变量更新**

```bash
git add .env.example
git commit -m "docs: add PAYMENT_ENABLED to env example"
```

---

### Task 4: 修改账户页面添加配置检查

**Files:**
- Modify: `app/account/page.tsx:1-10` (导入部分)
- Modify: `app/account/page.tsx:10-67` (组件主体)
- Modify: `app/account/page.tsx:119-121` (按钮渲染逻辑)

- [ ] **Step 1: 在 app/account/page.tsx 顶部导入 getSiteConfig**

在文件开头（第 1 行之后）添加导入：

```typescript
import { getSiteConfig } from "@/lib/config";
```

完整导入部分应变为：

```typescript
import { createClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/config";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";
import UpgradeButton from "./upgrade-button";
import CancelButton from "./cancel-button";
import ResumeButton from "./resume-button";
```

- [ ] **Step 2: 在 AccountPage 组件开头读取配置**

在 `export default async function AccountPage()` 函数的第一行（第 11 行之后）添加：

```typescript
const config = getSiteConfig();
```

完整函数开头应变为：

```typescript
export default async function AccountPage() {
  const supabase = await createClient();
  const config = getSiteConfig();
  const {
    data: { user },
  } = await supabase.auth.getUser();
```

- [ ] **Step 3: 修改按钮渲染逻辑，添加配置检查**

将第 119-121 行的按钮渲染逻辑：

```tsx
{activeSub?.status === "active" && <CancelButton />}
{activeSub?.status === "scheduled_cancel" && <ResumeButton />}
{!hasAccess && <UpgradeButton />}
```

替换为：

```tsx
{activeSub?.status === "active" && <CancelButton />}
{activeSub?.status === "scheduled_cancel" && <ResumeButton />}
{!hasAccess && !config.paymentEnabled && (
  <div className="border-t border-sand pt-4">
    <div className="flex items-center gap-2 text-warm">
      <span className="text-sm">升级功能即将上线</span>
      <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">Coming soon</span>
    </div>
  </div>
)}
{!hasAccess && config.paymentEnabled && <UpgradeButton />}
```

**说明：**
- 只有当用户无订阅且支付功能启用时，才显示升级按钮
- 当用户无订阅且支付功能禁用时，显示 "Coming soon" 消息
- 取消和恢复按钮的渲染逻辑不受影响

- [ ] **Step 4: 验证代码无语法错误**

Run: `npm run lint`
Expected: 无错误输出

- [ ] **Step 5: 提交账户页面修改**

```bash
git add app/account/page.tsx
git commit -m "feat: conditionally render upgrade button based on config"
```

---

### Task 5: 本地测试验证

**Files:**
- Modify: `.env.local` (临时修改用于测试)

- [ ] **Step 1: 在 .env.local 中添加 PAYMENT_ENABLED=false 用于测试**

在 `.env.local` 文件末尾添加：

```bash
PAYMENT_ENABLED=false
```

- [ ] **Step 2: 启动开发服务器**

Run: `npm run dev`
Expected: 开发服务器在 localhost:3000 启动

- [ ] **Step 3: 手动测试 - 未登录用户**

操作：
1. 打开浏览器访问 `http://localhost:3000/account`
2. 观察页面行为

Expected: 自动重定向到 `/login` 页面

- [ ] **Step 4: 手动测试 - 已登录无订阅用户**

操作：
1. 登录账户（使用测试账号或创建新账号）
2. 访问 `http://localhost:3000/account`
3. 观察订阅区域

Expected:
- 显示订阅状态为 "Free Tier"
- 显示 "升级功能即将上线" 文本和 "Coming soon" 徽章
- 无升级按钮

- [ ] **Step 5: 手动测试 - 已有活跃订阅用户（如果有测试数据）**

操作：
1. 使用有活跃订阅的测试账号登录
2. 访问 `http://localhost:3000/account`
3. 观察订阅区域

Expected:
- 显示订阅状态为 "Active"
- 显示到期日期
- 显示取消按钮（不受配置影响）
- 无 "Coming soon" 消息

- [ ] **Step 6: 手动测试 - 切换配置为启用状态**

操作：
1. 将 `.env.local` 中的 `PAYMENT_ENABLED=false` 改为 `PAYMENT_ENABLED=true`
2. 重启开发服务器（Ctrl+C 然后 `npm run dev`）
3. 使用无订阅账号登录，访问 `/account`

Expected:
- 显示升级按钮（而非 "Coming soon"）
- 按钮文本为 "Unlock Unlimited · $4.99/month"

- [ ] **Step 7: 恢复 .env.local 为禁用状态（用于后续开发）**

将 `.env.local` 中的配置改回：

```bash
PAYMENT_ENABLED=false
```

- [ ] **Step 8: 提交 .env.local 更新（如果尚未提交）**

注意：`.env.local` 通常不提交到版本控制，但如果需要提交测试配置：

```bash
git add .env.local
git commit -m "chore: set PAYMENT_ENABLED=false for local development"
```

---

### Task 6: 构建验证

**Files:**
- 无文件修改

- [ ] **Step 1: 运行生产构建**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 2: 验证构建输出**

检查构建输出中是否有类型错误或警告。

Expected: 构建成功完成，无错误。

- [ ] **Step 3: 提交最终状态**

如果所有测试通过且无需修改：

```bash
git status
```

Expected: 工作区干净，无未提交的更改。

---

## 部署清单

完成上述任务后，在生产环境部署：

1. **Vercel 环境变量设置：**
   - 进入 Vercel 项目设置
   - 导航到 Environment Variables
   - 添加 `PAYMENT_ENABLED` = `false`
   - 选择应用于 Production、Preview、Development 环境

2. **重新部署：**
   ```bash
   vercel --prod
   ```

3. **生产环境验证：**
   - 访问生产站点账户页面
   - 确认显示 "Coming soon" 消息
   - 确认无升级按钮

4. **后续恢复：**
   - 调整 Creem 账号后，将环境变量改为 `true`
   - 重新部署即可恢复升级功能

---

## 成功标准检查清单

- [ ] `lib/types.ts` 包含 `SiteConfig` 接口
- [ ] `lib/config.ts` 提供 `getSiteConfig()` 函数
- [ ] `.env.example` 包含 `PAYMENT_ENABLED` 变量说明
- [ ] `app/account/page.tsx` 根据配置条件渲染
- [ ] 本地测试：无订阅用户看到 "Coming soon"
- [ ] 本地测试：有订阅用户可正常使用取消/恢复按钮
- [ ] 本地测试：切换环境变量后功能正确切换
- [ ] 构建成功无错误
- [ ] 生产环境变量已设置
- [ ] 生产环境验证通过
