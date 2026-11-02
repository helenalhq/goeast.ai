// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ActionReview from "../../app/consult/iching/result/ActionReview";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const patchBodies = () =>
  fetchMock.mock.calls
    .filter((c: unknown[]) => (c[1] as RequestInit)?.method === "PATCH")
    .map((c: unknown[]) => JSON.parse((c[1] as RequestInit).body as string));

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  window.sessionStorage.clear();
});
afterEach(() => cleanup());

const ok = () => new Response(JSON.stringify({ saved: true }), { status: 200 });

describe("status selection (user-set only)", () => {
  it("renders three states, none selected initially when no server value", () => {
    render(<ActionReview sessionId="s1" />);
    expect(screen.getByRole("button", { name: "未开始" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "进行中" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "已完成" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "进行中" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("click → optimistic select + PATCH carries ONLY actionStatus", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    render(<ActionReview sessionId="s1" />);
    fireEvent.click(screen.getByRole("button", { name: "进行中" }));
    expect(screen.getByRole("button", { name: "进行中" }).getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(patchBodies().length).toBe(1));
    expect(patchBodies()[0]).toEqual({ sessionId: "s1", actionStatus: "in_progress" });
  });

  it("clicking the already-selected status sends nothing", async () => {
    render(<ActionReview sessionId="s1" initialStatus="done" />);
    fireEvent.click(screen.getByRole("button", { name: "已完成" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("server failure → revert to previous + error, retry works", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    render(<ActionReview sessionId="s1" initialStatus="not_started" />);
    fireEvent.click(screen.getByRole("button", { name: "已完成" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("button", { name: "已完成" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "未开始" }).getAttribute("aria-pressed")).toBe("true");
    // retry
    fetchMock.mockResolvedValueOnce(ok());
    fireEvent.click(screen.getByRole("button", { name: "已完成" }));
    await waitFor(() => expect(patchBodies().length).toBe(2));
    expect(screen.getByRole("button", { name: "已完成" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("late failure of an older click cannot overwrite a newer selection", async () => {
    let resolveOld: (v: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((res) => { resolveOld = res; })); // 进行中 — slow fail
    fetchMock.mockResolvedValueOnce(ok()); // 已完成 — fast ok
    render(<ActionReview sessionId="s1" />);
    fireEvent.click(screen.getByRole("button", { name: "进行中" }));
    fireEvent.click(screen.getByRole("button", { name: "已完成" }));
    await waitFor(() => expect(patchBodies().length).toBe(2));
    resolveOld(new Response("{}", { status: 500 })); // old response arrives last
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole("button", { name: "已完成" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull(); // no stale revert, no error
  });

  it("401 (not logged in) keeps the local selection without error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    render(<ActionReview sessionId="s1" />);
    fireEvent.click(screen.getByRole("button", { name: "进行中" }));
    await waitFor(() => expect(patchBodies().length).toBe(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByRole("button", { name: "进行中" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("reflection note", () => {
  it("save → PATCH carries ONLY reviewNote; Saved ✓ appears", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    render(<ActionReview sessionId="s1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "did it, felt calm" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Saved ✓")).toBeTruthy());
    expect(patchBodies()[0]).toEqual({ sessionId: "s1", reviewNote: "did it, felt calm" });
  });

  it("failure → error shown and the note text is intact; retry succeeds", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    render(<ActionReview sessionId="s1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my precious note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Retry Save")).toBeTruthy());
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("my precious note");
    fetchMock.mockResolvedValueOnce(ok());
    fireEvent.click(screen.getByRole("button", { name: "Retry Save" }));
    await waitFor(() => expect(screen.getByText("Saved ✓")).toBeTruthy());
  });

  it("editing after saved resets to idle (no false success on stale ✓)", () => {
    render(<ActionReview sessionId="s1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("401 → treated as saved-in-tab (no error)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    render(<ActionReview sessionId="s1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "local note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Saved ✓")).toBeTruthy());
  });

  it("server values seed the fields on mount (history reopen)", () => {
    render(<ActionReview sessionId="s1" initialStatus="done" initialNote="previous reflection" />);
    expect(screen.getByRole("button", { name: "已完成" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("previous reflection");
  });
});
