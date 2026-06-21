export default function CitationSnippet({ text, textZh }: { text: string; textZh?: string }) {
  return (
    <article
      data-citation="true"
      itemProp="description"
      className="bg-[#f5f0ea] border-l-3 border-china-red rounded-r-lg px-5 py-4 mb-8"
    >
      <p className="text-sm text-ink/80 leading-relaxed font-[Inter]">{text}</p>
      {textZh && (
        <p className="text-sm text-warm/60 leading-relaxed mt-2 border-t border-sand/50 pt-2" lang="zh">
          {textZh}
        </p>
      )}
    </article>
  );
}
