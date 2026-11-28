// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import CastView from "../../app/consult/iching/CastView";

const onAi = vi.fn();
const onRecast = vi.fn();
const onEdit = vi.fn();

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => cleanup());

function ui(cast: Parameters<typeof CastView>[0]["cast"]) {
  return <CastView cast={cast} question="q" onAiInterpretation={onAi} onRecast={onRecast} onEditQuestion={onEdit} />;
}

describe("CastView — free result display", () => {
  it("changing cast: shows hexagram, six lines, changing marker, transformed hexagram, classical text", () => {
    // 恒 32, changing line 1 → transformed 46 (011100 flip line1 → 111100 = 46 升? check)
    render(ui({ mode: "cast", hexagramNumber: 32, changingLines: [1], transformedNumber: 46 }));
    expect(screen.getByText(/Hexagram 32 · Heng/)).toBeTruthy();
    expect(screen.getAllByText(/changing 变/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Changing line: 1/)).toBeTruthy();
    expect(screen.getByText(/transforming into/i)).toBeTruthy();
    expect(screen.getByText(/恒：亨，无咎，利贞。利有攸往。/)).toBeTruthy(); // classical judgment
  });

  it("static cast: NO transformed hexagram, says static explicitly (无动爻不硬造)", () => {
    render(ui({ mode: "cast", hexagramNumber: 1, changingLines: [] }));
    expect(screen.getByText(/No changing lines — a static cast 静卦/)).toBeTruthy();
    expect(screen.queryByText(/transforming into/i)).toBeNull();
  });

  it("clearly labels the text as NOT personalized", () => {
    render(ui({ mode: "cast", hexagramNumber: 32, changingLines: [1], transformedNumber: 46 }));
    expect(screen.getByText(/same for everyone who casts it/)).toBeTruthy();
    expect(document.body.textContent).toContain("not");
    expect(document.body.textContent).toContain("personalized");
  });

  it("two actions separated: AI (login-gated) + explicit re-cast", () => {
    render(ui({ mode: "cast", hexagramNumber: 32, changingLines: [1], transformedNumber: 46 }));
    fireEvent.click(screen.getByRole("button", { name: /Get my AI interpretation/ }));
    expect(onAi).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Cast again/ }));
    expect(onRecast).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Edit question/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("same-tab-only restore scope is disclosed", () => {
    render(ui({ mode: "cast", hexagramNumber: 32, changingLines: [1], transformedNumber: 46 }));
    expect(screen.getByText(/same-tab only/i)).toBeTruthy();
  });
});
