type FAQItem = {
  question: string;
  answer: string;
  questionZh?: string;
  answerZh?: string;
};

export default function FAQ({
  items,
  jsonLd: _jsonLd,
}: {
  items: FAQItem[];
  jsonLd?: Record<string, unknown> | null;
}) {
  void _jsonLd;

  if (items.length === 0) return null;

  return (
    <section className="mt-12 border-t border-sand pt-8">
      <h2 className="font-serif text-2xl font-bold text-ink mb-6">
        Frequently Asked Questions
        <span className="text-sm text-warm font-normal ml-2">常见问题</span>
      </h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group bg-cream/60 rounded-sm border border-sand open:border-warm/40 transition-colors"
          >
            <summary className="cursor-pointer px-5 py-3 font-serif font-medium text-ink list-none flex items-center justify-between">
              <span>
                {item.question}
                {item.questionZh && (
                  <span className="text-warm text-sm ml-2 font-sans">{item.questionZh}</span>
                )}
              </span>
              <span className="text-warm text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <div className="px-5 pb-4 text-sm text-ink/80 leading-relaxed">
              <p>{item.answer}</p>
              {item.answerZh && (
                <p className="mt-2 text-warm/60" lang="zh">{item.answerZh}</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
