import { describe, expect, it } from "vitest";
import { readSseData } from "../sse";

/** Fake reader delivering pre-split string chunks, like network reads. */
function readerFrom(chunks: string[]) {
  const enc = new TextEncoder();
  let i = 0;
  return {
    async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
      if (i < chunks.length) return { done: false, value: enc.encode(chunks[i++]) };
      return { done: true, value: undefined };
    },
  };
}

describe("readSseData", () => {
  it("delivers a payload split mid-JSON across chunks as ONE event", async () => {
    const got: string[] = [];
    await readSseData(readerFrom(['data: {"con', 'tent":"h', 'i"}\n\ndata: [DONE]\n\n']), (p) => got.push(p));
    expect(got).toEqual(['{"content":"hi"}', "[DONE]"]);
  });

  it("delivers each frame from a single chunk separately", async () => {
    const got: string[] = [];
    await readSseData(readerFrom(['data: a\n\ndata: b\n\n']), (p) => got.push(p));
    expect(got).toEqual(["a", "b"]);
  });

  it("handles CRLF terminators and a final line without trailing newline", async () => {
    const got: string[] = [];
    await readSseData(readerFrom(["data: a\r\n", "data: b"]), (p) => got.push(p));
    expect(got).toEqual(["a", "b"]);
  });

  it("ignores non-data lines (comments, event fields)", async () => {
    const got: string[] = [];
    await readSseData(readerFrom([": keepalive\nevent: x\ndata: y\n\n"]), (p) => got.push(p));
    expect(got).toEqual(["y"]);
  });

  it("delivers nothing for an empty stream", async () => {
    const got: string[] = [];
    await readSseData(readerFrom([]), (p) => got.push(p));
    expect(got).toEqual([]);
  });
});
