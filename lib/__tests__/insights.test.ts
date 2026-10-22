import { describe, expect, it } from "vitest";
import { getInsightWithHtml, getInsightSlugs, stripDuplicateTitleH1 } from "../insights";

describe("stripDuplicateTitleH1", () => {
  it("strips a leading H1 that duplicates the frontmatter title", () => {
    const content = "# Wu Wei: The Chinese Philosophy of Effortless Action\n\nBody starts here.";
    const out = stripDuplicateTitleH1(
      content,
      "Wu Wei: The Chinese Philosophy of Effortless Action"
    );
    expect(out).not.toContain("# Wu Wei");
    expect(out).toContain("Body starts here.");
  });

  it("keeps a differing leading H1 and non-H1 content untouched", () => {
    const content = "# A Different Heading\n\nBody.";
    expect(stripDuplicateTitleH1(content, "Some Title")).toBe(content);
    expect(stripDuplicateTitleH1("Just body text.", "Some Title")).toBe("Just body text.");
  });

  it("strips a leading H1 wrapped in quotes that duplicates the title", () => {
    const content = '# "Wu Wei: The Chinese Philosophy of Effortless Action"\n\nBody.';
    const out = stripDuplicateTitleH1(
      content,
      "Wu Wei: The Chinese Philosophy of Effortless Action"
    );
    expect(out).not.toContain("#");
    expect(out).toContain("Body.");
  });
});

describe("insight HTML pipeline", () => {
  it("wu-wei article: zero body H1s (page supplies the only one) and a real <table>", async () => {
    const insight = await getInsightWithHtml("wu-wei-philosophy");
    expect(insight).not.toBeNull();
    expect((insight!.content.match(/<h1/g) || []).length).toBe(0);
    expect(insight!.content).toContain("<table>");
    expect(insight!.content).toContain("<th");
  });

  it("alipay article renders its comparison table, not raw pipe rows", async () => {
    const insight = await getInsightWithHtml("alipay-vs-wechat-pay-foreigner");
    expect(insight).not.toBeNull();
    expect(insight!.content).toContain("<table>");
    expect(insight!.content).not.toMatch(/<p>\s*\| Dimension \|/);
  });

  it("does not pass raw HTML through (remark-html escapes by default)", async () => {
    const insight = await getInsightWithHtml("wu-wei-philosophy");
    expect(insight!.content).not.toContain("<script");
  });
});

describe("insight meta description budget (root-cause rule)", () => {
  it("description sources stay within a Google-safe budget with clean endings", async () => {
    // Mirror of the page's rule — import the same helper if exported, else
    // assert the behavior via a locally-constructed description.
    const { clipText } = await import("../text");
    const budget = 155;
    for (const slug of getInsightSlugs()) {
      const insight = await getInsightWithHtml(slug);
      if (!insight?.takeaways?.length) continue;
      const description = clipText(
        `${insight.title}. ${insight.takeaways[0]}`,
        budget
      );
      expect(description.length, slug).toBeLessThanOrEqual(budget + 1);
      expect(description, slug).toMatch(/[.!?。！？]$/);
      expect(description.startsWith(insight.title), slug).toBe(true);
    }
  });
});
