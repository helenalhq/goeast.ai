// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";
import PhilosopherIntro from "../../components/PhilosopherIntro";

// Mock OracleOverlay (heavy component — we only test PhilosopherIntro's open/close logic)
vi.mock("../../components/OracleOverlay", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="oracle-overlay">
      <span>Oracle Overlay Open</span>
      <button data-testid="close-overlay" onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock oracle scenarios
vi.mock("../../lib/oracle-scenarios", () => ({
  getOracleScenarios: vi.fn(() => null),
}));

// Mock iching-context
vi.mock("../../lib/iching-context", () => ({
  ICHING_CONTEXT_DRAFT_KEY: "iching-context",
  unsealIchingContext: vi.fn(() => null),
  sealIchingContext: vi.fn((ctx: unknown) => ({ ctx, savedAt: Date.now() })),
  buildStudyContext: vi.fn((n: number) => ({ mode: "study", hexagramNumber: n, changingLines: [] })),
}));

// Mock draft
vi.mock("../../lib/draft", () => ({
  loadDraft: vi.fn(() => null),
  saveDraft: vi.fn(),
  clearDraft: vi.fn(),
  sealTextDraft: vi.fn((t: string) => ({ text: t, savedAt: Date.now() })),
  unsealTextDraft: vi.fn(() => null),
}));

// Mock types (portrait lookup)
vi.mock("../../lib/types", () => ({
  getOraclePortrait: vi.fn(() => null),
}));

describe("PhilosopherIntro — #oracle hash re-open fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
  });

  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  const props = {
    slug: "prologue-zhougong",
    intro: "Zhou Gong intro text",
    name: "Zhou Gong",
    nameZh: "周公",
    color: "#c0392b",
  };

  it("opens overlay when hash is #oracle on mount", () => {
    window.location.hash = "#oracle";
    render(<PhilosopherIntro {...props} />);
    expect(screen.getByTestId("oracle-overlay")).toBeTruthy();
  });

  it("does NOT open overlay when hash is empty on mount", () => {
    render(<PhilosopherIntro {...props} />);
    expect(screen.queryByTestId("oracle-overlay")).toBeNull();
  });

  it("closing the overlay clears the #oracle hash from the URL", () => {
    window.location.hash = "#oracle";
    render(<PhilosopherIntro {...props} />);

    expect(screen.getByTestId("oracle-overlay")).toBeTruthy();
    expect(window.location.hash).toBe("#oracle");

    fireEvent.click(screen.getByTestId("close-overlay"));
    expect(screen.queryByTestId("oracle-overlay")).toBeNull();
    expect(window.location.hash).toBe("");
  });

  it("re-opens overlay when hashchange fires with #oracle (Repro 1: article CTA → close → back → bottom link)", async () => {
    render(<PhilosopherIntro {...props} />);
    expect(screen.queryByTestId("oracle-overlay")).toBeNull();

    act(() => {
      window.location.hash = "#oracle";
    });

    await waitFor(() => {
      expect(screen.getByTestId("oracle-overlay")).toBeTruthy();
    });
  });

  it("re-opens overlay after close → hash set again (Repro 2: bottom link → close → back → article CTA)", async () => {
    window.location.hash = "#oracle";
    render(<PhilosopherIntro {...props} />);
    expect(screen.getByTestId("oracle-overlay")).toBeTruthy();

    fireEvent.click(screen.getByTestId("close-overlay"));
    expect(screen.queryByTestId("oracle-overlay")).toBeNull();
    expect(window.location.hash).toBe("");

    act(() => {
      window.location.hash = "#oracle";
    });

    await waitFor(() => {
      expect(screen.getByTestId("oracle-overlay")).toBeTruthy();
    });
  });

  it("does not produce a duplicate hash (#oracle#oracle)", async () => {
    window.location.hash = "#oracle";
    render(<PhilosopherIntro {...props} />);

    fireEvent.click(screen.getByTestId("close-overlay"));
    expect(window.location.hash).toBe("");

    act(() => {
      window.location.hash = "#oracle";
    });

    await waitFor(() => {
      expect(screen.getByTestId("oracle-overlay")).toBeTruthy();
    });

    expect(window.location.hash).toBe("#oracle");
    expect(window.location.hash).not.toContain("#oracle#");
  });

  it("multiple open-close cycles work without state corruption", async () => {
    render(<PhilosopherIntro {...props} />);

    for (let cycle = 0; cycle < 3; cycle++) {
      act(() => { window.location.hash = "#oracle"; });
      await waitFor(() => expect(screen.getByTestId("oracle-overlay")).toBeTruthy());
      fireEvent.click(screen.getByTestId("close-overlay"));
      expect(screen.queryByTestId("oracle-overlay")).toBeNull();
      expect(window.location.hash).toBe("");
    }
  });

  it("does not open overlay on unrelated hash changes", async () => {
    render(<PhilosopherIntro {...props} />);

    act(() => {
      window.location.hash = "#some-other-section";
    });

    await new Promise(r => setTimeout(r, 50));
    expect(screen.queryByTestId("oracle-overlay")).toBeNull();
  });
});
