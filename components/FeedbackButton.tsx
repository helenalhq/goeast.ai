// components/FeedbackButton.tsx
'use client';

interface FeedbackButtonProps {
  onClick: () => void;
}

export default function FeedbackButton({ onClick }: FeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-china-red text-white rounded-full shadow-lg hover:scale-110 transition-transform duration-200 flex items-center justify-center text-2xl group z-40"
      aria-label="Feedback"
      title="Feedback"
    >
      <span className="group-hover:hidden">💬</span>
      <span className="hidden group-hover:block text-sm font-medium">Feedback</span>
    </button>
  );
}
