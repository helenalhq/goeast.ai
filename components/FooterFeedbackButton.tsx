'use client';

export default function FooterFeedbackButton() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(new CustomEvent('openFeedback'));
      }}
      className="hover:text-china-red transition-colors cursor-pointer bg-transparent border-none text-inherit font-sans text-sm p-0"
    >
      💬 Feedback
    </button>
  );
}
