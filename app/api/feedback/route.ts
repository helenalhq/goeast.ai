// app/api/feedback/route.ts
import { createClient } from '@/lib/supabase/server';
import { sendFeedbackNotification, type FeedbackType } from '@/lib/email';
import { NextRequest } from 'next/server';

// Simple in-memory rate limiting
const feedbackRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 submissions per hour per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = feedbackRateLimit.get(ip);

  if (!entry || entry.resetAt < now) {
    feedbackRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: 'Too many submissions, please try again later' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, feedbackType, content, pagePath } = body;

    // Validate required fields
    if (!feedbackType || !content) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate feedback type
    const validTypes: FeedbackType[] = ['suggestion', 'problem', 'feature'];
    if (!validTypes.includes(feedbackType)) {
      return Response.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.trim().length < 10) {
      return Response.json(
        { error: 'Feedback content must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from('feedback')
      .insert({
        email: email || null,
        feedback_type: feedbackType,
        content: content.trim(),
        page_path: pagePath || null,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return Response.json(
        { error: 'Server error, please try again later' },
        { status: 500 }
      );
    }

    // Send email notification (don't wait for it)
    sendFeedbackNotification({
      email,
      feedbackType,
      content: content.trim(),
      pagePath,
    }).catch(err => console.error('Email notification failed:', err));

    return Response.json(
      { success: true, message: 'Thank you for your feedback!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Feedback submission error:', error);
    return Response.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
