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
  suggestion: '💡 Suggestion',
  problem: '🐛 Problem',
  feature: '✨ New Feature'
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
      from: 'GoEast.ai <onboarding@resend.dev>',
      to: 'helena.liuhanqing@gmail.com',
      subject: `[GoEast Feedback] ${typeLabel}`,
      html: `
        <h2>New Feedback</h2>
        <p><strong>Type:</strong> ${typeLabel}</p>
        <p><strong>Content:</strong></p>
        <blockquote>${feedback.content.replace(/\n/g, '<br>')}</blockquote>
        ${feedback.email ? `<p><strong>User Email:</strong> ${feedback.email}</p>` : ''}
        ${feedback.pagePath ? `<p><strong>Source Page:</strong> ${feedback.pagePath}</p>` : ''}
        <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })}</p>
      `
    });
  } catch (error) {
    // Log error but don't throw - email failure shouldn't block feedback submission
    console.error('Failed to send feedback notification email:', error);
  }
}
