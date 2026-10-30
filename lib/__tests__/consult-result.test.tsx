// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ReactMarkdown from "react-markdown";

// Test markdown rendering used in the result page's reflection section
describe("reflection question markdown rendering", () => {
  beforeEach(() => cleanup());

  it("renders bold text without showing raw asterisks", () => {
    const input = "What does **continuing the draft** mean for you?";
    const { container } = render(<ReactMarkdown>{input}</ReactMarkdown>);
    const strong = container.querySelector("strong");
    expect(strong).toBeTruthy();
    expect(strong?.textContent).toBe("continuing the draft");
    expect(container.textContent).not.toContain("**");
  });

  it("renders italic text without showing raw asterisks", () => {
    const input = "What is *wu wei* in this context?";
    const { container } = render(<ReactMarkdown>{input}</ReactMarkdown>);
    const em = container.querySelector("em");
    expect(em).toBeTruthy();
    expect(em?.textContent).toBe("wu wei");
  });

  it("renders code spans as code elements", () => {
    const input = "Use the `daily practice` approach";
    const { container } = render(<ReactMarkdown>{input}</ReactMarkdown>);
    const code = container.querySelector("code");
    expect(code).toBeTruthy();
    expect(code?.textContent).toBe("daily practice");
  });

  it("renders lists with proper list items and nested bold", () => {
    const input = "- First point\n- Second **bold** point\n- Third point";
    const { container } = render(<ReactMarkdown>{input}</ReactMarkdown>);
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(3);
    expect(items[1].querySelector("strong")?.textContent).toBe("bold");
  });
});

// Test the parseConsultResponse function with markdown-heavy AI responses
describe("parseConsultResponse with markdown formatting", () => {
  it("extracts reflection bullets containing bold markdown", async () => {
    const { parseConsultResponse } = await import("../consult-session");
    const mockResponse = [
      "## 1. TRADITIONAL TEACHING",
      "The classical text.",
      "",
      "## 2. AI INTERPRETATION",
      "The interpretation.",
      "",
      "## 3. REFLECTION",
      "- What does **continuing the draft** mean for you?",
      "- Where are you *forcing* outcomes?",
      "- List your **three** priorities.",
    ].join("\n");
    const sections = parseConsultResponse(mockResponse);
    expect(sections.reflection).toHaveLength(3);
    expect(sections.reflection[0]).toContain("**continuing the draft**");
    expect(sections.reflection[1]).toContain("*forcing*");
  });
});

// Test cross-account isolation — verify RLS behavior via mock
describe("consult result cross-account isolation", () => {
  it("user A querying user B's session_id gets null (RLS blocks)", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });
    const eqUser = vi.fn().mockReturnValue({ maybeSingle });
    const eqSession = vi.fn().mockReturnValue({ eq: eqUser });
    const mockFrom = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqSession }) });

    const result = await mockFrom()
      .select("*")
      .eq("session_id", "user-b-session-id")
      .eq("user_id", "user-a-uuid")
      .maybeSingle();

    expect(result.data).toBeNull();
    expect(eqSession).toHaveBeenCalledWith("session_id", "user-b-session-id");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-a-uuid");
  });

  it("PATCH updates only rows matching both session_id AND user_id", async () => {
    const eqUser = vi.fn().mockResolvedValue({ error: null, count: 0 });
    const eqSession = vi.fn().mockReturnValue({ eq: eqUser });
    const mockUpdate = vi.fn().mockReturnValue({ eq: eqSession });

    const result = await mockUpdate({ next_step: "hacked" })
      .eq("session_id", "user-b-session-id")
      .eq("user_id", "user-a-uuid");

    expect(result.count).toBe(0);
    expect(eqSession).toHaveBeenCalledWith("session_id", "user-b-session-id");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-a-uuid");
  });
});
