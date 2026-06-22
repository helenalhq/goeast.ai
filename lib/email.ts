// lib/email.ts
import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const typeLabels = {
  suggestion: '💡 建议',
  problem: '🐛 问题',
  feature: '✨ 新功能'
} as const;

export type FeedbackType = keyof typeof typeLabels;

export async function sendFeedbackNotification(feedback: {
  email?: string;
  feedbackType: FeedbackType;
  content: string;
  pagePath?: string;
}) {
  const typeLabel = typeLabels[feedback.feedbackType] || feedback.feedbackType;

  try {
    await getResend().emails.send({
      from: 'GoEast.ai <noreply@goeast.ai>',
      to: 'helena.liuhanqing@gmail.com',
      subject: `[GoEast 反馈] ${typeLabel}`,
      html: `
        <h2>新反馈</h2>
        <p><strong>类型：</strong>${typeLabel}</p>
        <p><strong>内容：</strong></p>
        <blockquote>${feedback.content.replace(/\n/g, '<br>')}</blockquote>
        ${feedback.email ? `<p><strong>用户邮箱：</strong>${feedback.email}</p>` : ''}
        ${feedback.pagePath ? `<p><strong>来源页面：</strong>${feedback.pagePath}</p>` : ''}
        <p><strong>提交时间：</strong>${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
      `
    });
  } catch (error) {
    // Log error but don't throw - email failure shouldn't block feedback submission
    console.error('Failed to send feedback notification email:', error);
  }
}
