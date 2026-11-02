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

  it("streams a live preview while generating, then the final thread replaces it", async () => {
    // Multi-read stream with delays: the partial "part1" must be visible
    // BEFORE the stream completes — that's the live preview under test.
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(c) {
        c.enqueue(enc.encode(`data: ${JSON.stringify({ content: "part1" })}\n\n`));
        await new Promise((r) => setTimeout(r, 120));
        c.enqueue(enc.encode(`data: ${JSON.stringify({ content: " part2" })}\n\n`));
        await new Promise((r) => setTimeout(r, 120));
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
      },
    });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "live question" } });
    fetchMock.mockResolvedValueOnce(new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ followups: [{ id: "t1", question: "live question", answer: "part1 part2", turnIndex: 1, createdAt: "2026-01-01" }], count: 1, limitReached: false }), { status: 200 }),
    );
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    // Mid-stream: partial answer + generating indicator both visible
    await waitFor(() => expect(screen.getByText("part1")).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/Consulting Zhou Gong/)).toBeTruthy());
    // Final: canonical thread shows the complete answer
    await waitFor(() => expect(screen.getByText("part1 part2")).toBeTruthy());
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith("consult_followup_completed"));
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

describe("turnKey idempotency behavior", () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const lastPostBody = () => {
    const posts = fetchMock.mock.calls.filter((c: unknown[]) => (c[1] as RequestInit)?.method === "POST");
    return JSON.parse((posts[posts.length - 1][1] as RequestInit).body as string);
  };

  it("POST carries a UUID turnKey", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "q" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["answer"]));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [{ id: "t1", question: "q", answer: "answer", turnIndex: 1, createdAt: "2026-01-01" }], count: 1, limitReached: false }), { status: 200 }));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith("consult_followup_completed"));
    expect(UUID_RE.test(lastPostBody().turnKey)).toBe(true);
  });

  it("network failure keeps the turnKey — retry reuses it (server can replay)", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flaky" } });
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    const key1 = lastPostBody().turnKey;

    // user retries the same question — same key, so the server replays if saved
    fetchMock.mockResolvedValueOnce(sseResponse(["recovered answer"]));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [{ id: "t1", question: "flaky", answer: "recovered answer", turnIndex: 1, createdAt: "2026-01-01" }], count: 1, limitReached: false }), { status: 200 }));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith("consult_followup_completed"));
    expect(lastPostBody().turnKey).toBe(key1);
  });

  it("after a completed turn the next ask gets a fresh key", async () => {
    const thread = (q: string, a: string) => new Response(JSON.stringify({ followups: [{ id: "t", question: q, answer: a, turnIndex: 1, createdAt: "2026-01-01" }], count: 1, limitReached: false }), { status: 200 });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    // ask #1
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "first" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["a1"]));
    fetchMock.mockResolvedValueOnce(thread("first", "a1"));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith("consult_followup_completed"));
    const key1 = lastPostBody().turnKey;
    // ask #2
    await waitFor(() => expect(screen.getByRole("textbox")).toBeTruthy());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "second" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["a2"]));
    fetchMock.mockResolvedValueOnce(thread("second", "a2"));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(fetchMock.mock.calls.filter((c: unknown[]) => (c[1] as RequestInit)?.method === "POST").length).toBe(2));
    expect(lastPostBody().turnKey).not.toBe(key1);
  });
});
