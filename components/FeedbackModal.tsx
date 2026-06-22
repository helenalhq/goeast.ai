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
      setError('反馈内容至少需要 10 个字符');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('邮箱格式不正确');
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
        setError('提交太频繁，请稍后再试');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || '服务器错误，请稍后重试');
        return;
      }

      setIsSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setError('网络连接失败，请检查网络后重试');
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
                💬 有什么想法？聊聊吧！
              </h2>
              <p className="text-warm text-sm">
                你的反馈对我们很重要，无论是建议、问题还是新功能想法，我们都想听。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  反馈类型 <span className="text-china-red">*</span>
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'suggestion', label: '💡 建议' },
                    { value: 'problem', label: '🐛 问题' },
                    { value: 'feature', label: '✨ 新功能' },
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
                  你的想法 <span className="text-china-red">*</span>
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请描述你的想法..."
                  rows={4}
                  className="w-full px-4 py-2 border border-sand rounded-lg focus:outline-none focus:ring-2 focus:ring-china-red/50 focus:border-china-red resize-none"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                  邮箱（可选，方便我们回复你）
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
                我们尊重你的隐私，反馈内容仅用于改进网站
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-warm hover:text-ink transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="px-6 py-2 bg-china-red text-white rounded-lg hover:bg-china-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '发送中...' : '发送反馈 →'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-ink mb-3">感谢你的反馈！</h2>
            <p className="text-warm mb-4">
              我们已收到你的想法，会认真查看。
            </p>
            <p className="text-sm text-warm mb-6">
              如果想继续交流，欢迎邮件联系：<br />
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
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
