/**
 * SSE `data:` frame reader for fetch-body streams.
 *
 * The naive `decode(value).split("\n")` loop drops any frame that a network
 * chunk boundary splits mid-line — the tail fragment fails JSON.parse and is
 * silently skipped. This reader keeps a carry buffer so every frame is
 * delivered whole, no matter how reads land.
 */

type AnyReader = { read(): Promise<ReadableStreamReadResult<Uint8Array>> };

/** Feed each complete `data: …` payload (trimmed, `[DONE]` included) to onData. */
export async function readSseData(reader: AnyReader, onData: (payload: string) => void): Promise<void> {
  const decoder = new TextDecoder();
  let carry = "";

  const emit = (line: string) => {
    if (line.startsWith("data: ")) onData(line.slice(6).trim());
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = carry.indexOf("\n")) !== -1) {
      emit(carry.slice(0, nl));
      carry = carry.slice(nl + 1);
    }
  }

  // Flush the decoder and any final unterminated line.
  carry += decoder.decode();
  if (carry) emit(carry);
}
