// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import FollowupSection from "../../app/consult/iching/result/FollowupSection";
import { logEvent } from "../analytics";

vi.mock("../analytics", () => ({ logEvent: vi.fn() }));
vi.mock("react-markdown", () => ({ default: ({ children }: { children: string }) => <div data-testid="md">{children}</div> }));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  window.sessionStorage.clear();
});
afterEach(() => cleanup());

function sseResponse(chunks: string[], saveFailed = false) {
  const body = [
    ...chunks.map((c) => `data: ${JSON.stringify({ content: c })}\n\n`),
    ...(saveFailed ? [`data: ${JSON.stringify({ saveFailed: true })}\n\n`] : []),
    "data: [DONE]\n\n",
  ].join("");
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

describe("account-status gating", () => {
  it("saved report → shows the continue button, then loads turns", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ followups: [{ id: "t1", question: "q1", answer: "a1", turnIndex: 1, createdAt: "2026-01-01" }], count: 1, limitReached: false }), { status: 200 }),
    );
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    expect(screen.getByText("继续讨论这次解读")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("q1")).toBeTruthy());
  });

  it("local-only report → explanation + login link, no input, no fetch", () => {
    render(<FollowupSection sessionId="s1" accountStatus="local" />);
    expect(screen.getByText(/only saved in this tab/i)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ask + failure handling", () => {
  it("happy path: streams, refetches thread, fires completed, clears draft", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);

    fireEvent.click(screen.getByText("继续讨论这次解读"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "PIIMARK what about line 1?" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["part1", " part2"]));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ followups: [{ id: "t1", question: "PIIMARK what about line 1?", answer: "part1 part2", turnIndex: 1, createdAt: "2026-01-01" }], count: 1, limitReached: false }), { status: 200 }),
    );
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("part1 part2")).toBeTruthy());
    expect(logEvent).toHaveBeenCalledWith("consult_followup_started");
    expect(logEvent).toHaveBeenCalledWith("consult_followup_completed");
    for (const call of vi.mocked(logEvent).mock.calls) {
      expect(JSON.stringify(call[1] || {})).not.toContain("PIIMARK");
    }
  });

  it("API failure → error banner, input preserved, failed event with reason", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my precious draft" } });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Daily consultation limit reached. Free accounts get 3 readings/day, Pro 10/day.", code: "LIMIT_REACHED" }), { status: 429 }));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("my precious draft");
    expect(logEvent).toHaveBeenCalledWith("consult_followup_failed", { reason: "limit_reached" });
  });

  it("saveFailed marker → warning shown, completed NOT fired, failed save_failed fired", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "q" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["generated answer"], true));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/may be lost/i)).toBeTruthy());
    expect(logEvent).toHaveBeenCalledWith("consult_followup_failed", { reason: "save_failed" });
    expect(logEvent).not.toHaveBeenCalledWith("consult_followup_completed");
  });

  it("empty stream (DONE with no content) → error banner, input preserved, empty_response event", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my question" } });
    fetchMock.mockResolvedValueOnce(sseResponse([]));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("my question");
    expect(logEvent).toHaveBeenCalledWith("consult_followup_failed", { reason: "empty_response" });
    expect(logEvent).not.toHaveBeenCalledWith("consult_followup_completed");
  });

  it("thread refetch fails after a good stream → answer still shown, completed fires", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    await waitFor(() => expect(screen.queryByText("Loading conversation…")).toBeNull()); // mount load settles first
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my question" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["the answer"]));
    fetchMock.mockRejectedValueOnce(new Error("refetch down"));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("the answer")).toBeTruthy());
    expect(screen.getByText("my question")).toBeTruthy();
    expect(logEvent).toHaveBeenCalledWith("consult_followup_completed");
  });

  it("thread refetch non-ok after a good stream → answer still shown, no save warning", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    await waitFor(() => expect(screen.queryByText("Loading conversation…")).toBeNull()); // mount load settles first
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my question" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["the answer"]));
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("the answer")).toBeTruthy());
    expect(screen.getByText("my question")).toBeTruthy();
    expect(screen.queryByText(/may be lost/i)).toBeNull();
    expect(logEvent).toHaveBeenCalledWith("consult_followup_completed");
  });
});
