// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ArticleStudyCTA from "../../components/ArticleStudyCTA";
import { loadDraft } from "../draft";
import { unsealIchingContext, ICHING_CONTEXT_DRAFT_KEY } from "../iching-context";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock analytics
vi.mock("../analytics", () => ({
  logEvent: vi.fn(),
}));

// Mock supabase client (not used in this component but may be imported transitively)
vi.mock("../supabase/client", () => ({
  createClient: vi.fn(),
}));

const mockPush = vi.fn();
(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush });

describe("ArticleStudyCTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the correct button text and helper text", () => {
    render(<ArticleStudyCTA hexagramNumber={52} hexagramSlug="gen-mountain" />);
    expect(screen.getByText(/Explore this hexagram with AI/i)).toBeTruthy();
    expect(screen.getByText(/Discuss this hexagram/i)).toBeTruthy();
    expect(screen.getByText(/login required/i)).toBeTruthy();
  });

  it("stores study-mode context with the correct hexagram number", () => {
    render(<ArticleStudyCTA hexagramNumber={52} hexagramSlug="gen-mountain" />);
    fireEvent.click(screen.getByRole("button", { name: /Explore this hexagram/i }));

    const envelope = loadDraft(ICHING_CONTEXT_DRAFT_KEY);
    expect(envelope).toBeTruthy();
    const ctx = unsealIchingContext(envelope);
    expect(ctx?.mode).toBe("study");
    expect(ctx?.hexagramNumber).toBe(52);
    expect(ctx?.changingLines).toEqual([]);
  });

  it("stores source attribution with pathname only", () => {
    render(<ArticleStudyCTA hexagramNumber={47} hexagramSlug="kun-oppression" />);
    fireEvent.click(screen.getByRole("button", { name: /Explore this hexagram/i }));

    const source = sessionStorage.getItem("goeast:draft:oracle-source");
    expect(source).toBe("/iching/kun-oppression");
    // No query params or user input in the source
    expect(source).not.toContain("?");
  });

  it("fires hexagram_study_clicked with correct payload", async () => {
    const { logEvent } = await import("../analytics");
    render(<ArticleStudyCTA hexagramNumber={47} hexagramSlug="kun-oppression" />);
    fireEvent.click(screen.getByRole("button", { name: /Explore this hexagram/i }));

    expect(logEvent).toHaveBeenCalledWith("hexagram_study_clicked", {
      hexagram: 47,
      source_article: "/iching/kun-oppression",
      cta_position: "in_article",
    });
  });

  it("clicking the button does not throw and sets up the study context (navigation via window.location.assign, not mockable in jsdom)", () => {
    // window.location.assign causes a full page navigation which jsdom can't mock.
    // We verify the click handler completes without error and the draft state is correct.
    // The actual navigation URL is verified by the browser-level integration tests.
    render(<ArticleStudyCTA hexagramNumber={52} hexagramSlug="gen-mountain" />);
    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: /Explore this hexagram/i }));
    }).not.toThrow();

    // Verify the study context was set (proves the click handler ran to completion
    // up to the navigation call)
    const envelope = loadDraft(ICHING_CONTEXT_DRAFT_KEY);
    const ctx = unsealIchingContext(envelope);
    expect(ctx?.mode).toBe("study");
    expect(ctx?.hexagramNumber).toBe(52);
  });

  it("clears old question draft (start new consultation)", () => {
    // Pre-populate an old question draft
    sessionStorage.setItem("goeast:draft:oracle:prologue-zhougong", JSON.stringify({
      text: "old question",
      savedAt: Date.now(),
    }));

    render(<ArticleStudyCTA hexagramNumber={52} hexagramSlug="gen-mountain" />);
    fireEvent.click(screen.getByRole("button", { name: /Explore this hexagram/i }));

    // Old question should be cleared
    expect(sessionStorage.getItem("goeast:draft:oracle:prologue-zhougong")).toBeNull();
  });

  it("takeSource clears after one read (no cross-session attribution)", async () => {
    const { takeSource } = await import("../draft");
    sessionStorage.setItem("goeast:draft:oracle-source", "/iching/gen-mountain");

    const first = takeSource("oracle-source");
    expect(first).toBe("/iching/gen-mountain");

    const second = takeSource("oracle-source");
    expect(second).toBeNull(); // cleared after first read
  });

  it("repeated clicks don't duplicate state (each click resets draft)", () => {
    render(<ArticleStudyCTA hexagramNumber={52} hexagramSlug="gen-mountain" />);
    const button = screen.getByRole("button", { name: /Explore this hexagram/i });

    fireEvent.click(button);
    fireEvent.click(button);

    // Only one navigation (second click re-navigates but that's fine — same destination)
    // Key check: context is still valid study mode
    const envelope = loadDraft(ICHING_CONTEXT_DRAFT_KEY);
    const ctx = unsealIchingContext(envelope);
    expect(ctx?.mode).toBe("study");
    expect(ctx?.hexagramNumber).toBe(52);
  });

  it("does not render changing lines (study mode, not cast)", () => {
    render(<ArticleStudyCTA hexagramNumber={52} hexagramSlug="gen-mountain" />);
    fireEvent.click(screen.getByRole("button", { name: /Explore this hexagram/i }));

    const envelope = loadDraft(ICHING_CONTEXT_DRAFT_KEY);
    const ctx = unsealIchingContext(envelope);
    expect(ctx?.changingLines).toEqual([]);
    expect(ctx?.transformedNumber).toBeUndefined();
  });
});
