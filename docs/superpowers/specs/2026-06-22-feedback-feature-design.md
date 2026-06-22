# 反馈功能设计文档

**日期：** 2026-06-22  
**状态：** 已批准，待实施

## 概述

为 GoEast.ai 网站添加用户反馈功能，让访客可以方便地提交建议、问题和新功能想法。该功能旨在营造开放交流的氛围，帮助用户参与网站定位的探索。

## 功能目标

- 收集用户的想法、建议、问题和新功能需求
- 营造开放交流的氛围，鼓励用户互动
- 帮助用户参与网站定位的探索
- 提供便捷的反馈渠道，降低提交门槛

## 技术方案

### 数据存储

反馈数据存储在 Supabase 数据库中，同时发送邮件通知到 helena.liuhanqing@gmail.com。

### 数据库设计

在 Supabase 中创建 `feedback` 表：

```sql
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,                    -- 可选
  feedback_type TEXT NOT NULL,   -- 'suggestion' | 'problem' | 'feature'
  content TEXT NOT NULL,
  page_path TEXT,                -- 用户当前所在页面（可选）
  created_at TIMESTAMP DEFAULT NOW()
);

-- 添加索引，方便按类型和日期查询
CREATE INDEX idx_feedback_type ON feedback(feedback_type);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
```

### API 路由

创建 `app/api/feedback/route.ts`：

**端点：** `POST /api/feedback`

**请求体：**
```json
{
  "email": "user@example.com",
  "feedbackType": "suggestion",
  "content": "我觉得可以增加...",
  "pagePath": "/skills/translate"
}
```

**处理流程：**
1. 验证必填字段（feedbackType, content）
2. 验证邮箱格式（如果提供）
3. 应用 rate limiting（每个 IP 每小时最多 5 次提交）
4. 插入 Supabase 数据库
5. 发送邮件通知
6. 返回成功响应

**错误处理：**
- 400: 缺少必填字段或格式错误
- 429: 提交频率过高
- 500: 服务器错误

### 邮件通知

使用 Resend 发送邮件通知：

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendFeedbackNotification(feedback: {
  email?: string;
  feedbackType: string;
  content: string;
  pagePath?: string;
}) {
  const typeLabels = {
    suggestion: '💡 建议',
    problem: '🐛 问题',
    feature: '✨ 新功能'
  };

  await resend.emails.send({
    from: 'GoEast.ai <noreply@goeast.ai>',
    to: 'helena.liuhanqing@gmail.com',
    subject: `[GoEast 反馈] ${typeLabels[feedback.feedbackType]}`,
    html: `
      <h2>新反馈</h2>
      <p><strong>类型：</strong>${typeLabels[feedback.feedbackType]}</p>
      <p><strong>内容：</strong></p>
      <blockquote>${feedback.content}</blockquote>
      ${feedback.email ? `<p><strong>用户邮箱：</strong>${feedback.email}</p>` : ''}
      ${feedback.pagePath ? `<p><strong>来源页面：</strong>${feedback.pagePath}</p>` : ''}
      <p><strong>提交时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
    `
  });
}
```

**环境变量：**
```env
RESEND_API_KEY=re_xxx...
```

**Resend 配置：**
- 注册 Resend 账号（免费额度：每月 3000 封邮件）
- 配置发件域名（goeast.ai）或使用测试邮箱

### Rate Limiting

复用现有的 `lib/rate-limit.ts`，为反馈 API 设置限制：

```typescript
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  uniqueTokenPerInterval: 50,
  interval: 60 * 60 * 1000,  // 1 小时
  limit: 5                    // 每个 IP 每小时最多 5 次
});
```

## 前端设计

### 入口位置

**浮动按钮：**
- 固定在页面右下角，滚动时始终可见
- 圆形按钮，直径 56px（移动端 48px）
- 图标：💬 对话图标
- 背景色：china-red (#c0392b)
- 悬停效果：放大 1.1 倍 + 显示"反馈建议"文字提示
- 点击后打开模态框
- z-index 设置确保在最上层

**页脚链接：**
- 在 Footer 组件中添加"💬 反馈建议"链接
- 点击后打开同一个模态框，不跳转页面

### 模态框表单

**布局：**
- 居中弹窗，最大宽度 480px
- 半透明黑色遮罩，点击遮罩可关闭
- ESC 键也可关闭

**表单结构：**

```
┌─────────────────────────────────────┐
│  💬 有什么想法？聊聊吧！              │
│                                     │
│  你的反馈对我们很重要，无论是建议、   │
│  问题还是新功能想法，我们都想听。     │
│                                     │
│  ─────────────────────────────      │
│                                     │
│  反馈类型 *                          │
│  [💡 建议] [🐛 问题] [✨ 新功能]     │
│                                     │
│  你的想法 *                          │
│  ┌─────────────────────────────┐   │
│  │  请描述你的想法...           │   │
│  └─────────────────────────────┘   │
│                                     │
│  邮箱（可选，方便我们回复你）         │
│  ┌─────────────────────────────┐   │
│  │  your@email.com              │   │
│  └─────────────────────────────┘   │
│                                     │
│  [取消]            [发送反馈 →]     │
└─────────────────────────────────────┘
```

**交互细节：**
- 反馈类型使用标签按钮（点击高亮选中）
- 必填字段标记星号 *
- 提交按钮在未填写必填项时禁用
- 提交中显示 loading 状态
- 表单文案采用友好、对话式语气

**响应式设计：**
- 移动端：模态框宽度 90%，从底部滑入
- 桌面端：居中弹窗，带淡入动画

### 提交成功状态

提交成功后，模态框内容切换为：

```
┌─────────────────────────────────────┐
│         ✓ 感谢你的反馈！             │
│                                     │
│  我们已收到你的想法，会认真查看。     │
│                                     │
│  如果想继续交流，欢迎邮件联系：       │
│  📧 helena.liuhanqing@gmail.com    │
│                                     │
│  [关闭]                             │
└─────────────────────────────────────┘
```

3 秒后自动关闭，或点击"关闭"按钮手动关闭。

## 错误处理

### 前端

- 网络错误：显示"网络连接失败，请检查网络后重试"
- 429 错误：显示"提交太频繁，请稍后再试"
- 400 错误：显示具体的验证错误信息
- 500 错误：显示"服务器错误，请稍后重试"

### 后端

- 所有数据库操作使用 try-catch 包裹
- 邮件发送失败不影响反馈提交（仅记录错误日志）
- 返回统一的错误格式：`{ error: string }`

## 数据隐私

- 在表单底部添加隐私提示："我们尊重你的隐私，反馈内容仅用于改进网站"
- 不收集任何敏感信息
- 用户邮箱仅用于回复反馈，不会用于其他用途

## 测试计划

手动测试以下场景：

1. **正常流程：** 填写完整表单 → 提交成功 → 收到邮件
2. **必填项验证：** 不填内容 → 提交按钮禁用
3. **邮箱验证：** 填写无效邮箱 → 显示格式错误
4. **频率限制：** 快速提交 6 次 → 第 6 次被拒绝
5. **响应式：** 在移动端打开模态框 → 布局正确
6. **关闭逻辑：** 点击遮罩/ESC/取消按钮 → 模态框关闭

## 文件结构

新增文件：
```
app/
  api/
    feedback/
      route.ts          # API 端点
components/
  FeedbackButton.tsx    # 浮动按钮
  FeedbackModal.tsx     # 模态框表单
lib/
  email.ts              # 邮件发送工具
```

修改文件：
```
components/
  Footer.tsx            # 添加反馈链接
```

## 依赖

新增 npm 包：
```bash
npm install resend
```

## 环境变量

新增环境变量：
```env
RESEND_API_KEY=re_xxx...
```
