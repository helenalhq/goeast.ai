// components/FeedbackModal.tsx
'use client';

import { useState, useEffect } from 'react';

type FeedbackType = 'suggestion' | 'problem' | 'feature';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting]);

  const handleClose = () => {
    if (isSubmitting) return;
    setFeedbackType('suggestion');
    setContent('');
    setEmail('');
    setError('');
    setIsSubmitted(false);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (content.trim().length < 10) {
      setError('Feedback must be at least 10 characters');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType,
          content: content.trim(),
          email: email.trim() || undefined,
          pagePath: window.location.pathname,
        }),
      });

      if (response.status === 429) {
        setError('Too many submissions, please try again later');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Server error, please try again later');
        return;
      }

      setIsSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setError('Network connection failed, please check your network and try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isFormValid = content.trim().length >= 10 &&
                      (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-ink mb-2">
                💬 Got ideas? Let's chat!
              </h2>
              <p className="text-warm text-sm">
                Your feedback matters to us — whether it's a suggestion, a problem, or a new feature idea, we want to hear it.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Feedback Type <span className="text-china-red">*</span>
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'suggestion', label: '💡 Suggestion' },
                    { value: 'problem', label: '🐛 Problem' },
                    { value: 'feature', label: '✨ New Feature' },
                  ] as const).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFeedbackType(type.value)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                        feedbackType === type.value
                          ? 'border-china-red bg-china-red/10 text-ink font-medium'
                          : 'border-sand hover:border-warm text-warm'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-ink mb-2">
                  Your Thoughts <span className="text-china-red">*</span>
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe your thoughts..."
                  rows={4}
                  className="w-full px-4 py-2 border border-sand rounded-lg focus:outline-none focus:ring-2 focus:ring-china-red/50 focus:border-china-red resize-none"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                  Email (optional, so we can reply to you)
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-sand rounded-lg focus:outline-none focus:ring-2 focus:ring-china-red/50 focus:border-china-red"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <p className="text-china-red text-sm">{error}</p>
              )}

              <p className="text-xs text-warm">
                We respect your privacy. Feedback is only used to improve the site.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-warm hover:text-ink transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="px-6 py-2 bg-china-red text-white rounded-lg hover:bg-china-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback →'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-ink mb-3">Thank you for your feedback!</h2>
            <p className="text-warm mb-4">
              We've received your thoughts and will review them carefully.
            </p>
            <p className="text-sm text-warm mb-6">
              Want to continue the conversation? Email us at:<br />
              <a
                href="mailto:helena.liuhanqing@gmail.com"
                className="text-china-red hover:underline"
              >
                📧 helena.liuhanqing@gmail.com
              </a>
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-china-red text-white rounded-lg hover:bg-china-red/90 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
