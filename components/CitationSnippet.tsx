export default function CitationSnippet({ text, textZh }: { text: string; textZh?: string }) {
  return (
    <blockquote
      style={{
        borderLeft: "3px solid rgba(192, 57, 43, 0.6)",
        paddingLeft: 28,
        margin: 0,
        padding: "48px 32px 56px",
      }}
    >
      <p
        className="font-serif"
        style={{
          fontSize: 16,
          color: "#8b7355",
          fontStyle: "italic",
          lineHeight: 1.9,
        }}
      >
        {text}
      </p>
      {textZh && (
        <p
          className="font-serif"
          style={{
            fontSize: 14,
            color: "#8b7355",
            opacity: 0.6,
            fontStyle: "italic",
            lineHeight: 1.9,
            marginTop: 12,
          }}
          lang="zh"
        >
          {textZh}
        </p>
      )}
    </blockquote>
  );
}
