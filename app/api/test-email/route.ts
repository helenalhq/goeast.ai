// app/api/test-email/route.ts
import { Resend } from 'resend';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'RESEND_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: 'GoEast.ai <onboarding@resend.dev>',
      to: 'helena.liuhanqing@gmail.com',
      subject: '[Test] Resend Email Test',
      html: '<p>This is a test email from GoEast.ai feedback system.</p>',
    });

    return Response.json({
      success: true,
      message: 'Test email sent successfully',
      result,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return Response.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
