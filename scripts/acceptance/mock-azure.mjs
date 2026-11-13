/**
 * Mock Azure OpenAI SSE server for LOCAL fault-injection testing.
 * Never used in production — the app under test must be started with
 * AZURE_OPENAI_ENDPOINT=http://localhost:3199 (and any non-empty api key).
 *
 * Scenario is read per-request from /tmp/goeast-3b/mock-scenario.txt:
 *   ok          — stream 3 content chunks, then DONE            (healthy)
 *   create500   — immediate HTTP 500 JSON error                 (model down)
 *   slowfail    — wait 800ms, then 500                          (slow failure)
 *   streambreak — 2 chunks, then destroy the socket             (cut mid-stream)
 *   emptydone   — DONE with zero content chunks                 (empty stream)
 *   slowok      — wait 800ms, then stream normally              (slow success)
 *
 * Every request is appended to /tmp/goeast-3b/mock-requests.log as JSON lines
 * {at, scenario, path} so tests can prove the model was/wasn't called.
 *
 * Run: node scripts/acceptance/mock-azure.mjs  (listens on :3199)
 */
import http from "http";
import fs from "fs";

const SCENARIO_FILE = "/tmp/goeast-3b/mock-scenario.txt";
const REQUEST_LOG = "/tmp/goeast-3b/mock-requests.log";
const PORT = 3199;

fs.mkdirSync("/tmp/goeast-3b", { recursive: true });

function scenario() {
  try {
    return (fs.readFileSync(SCENARIO_FILE, "utf8").trim() || "ok");
  } catch {
    return "ok";
  }
}

function logRequestLegacy(s) { /* folded into the per-request logger above */ }

function sseChunk(res, content) {
  res.write(`data: ${JSON.stringify({
    id: "mock", object: "chat.completion.chunk", created: Date.now() / 1000, model: "mock",
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  })}\n\n`);
}

const server = http.createServer((req, res) => {
  if (!req.url?.includes("/chat/completions")) {
    res.writeHead(404).end();
    return;
  }
  const s = scenario();
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    // Privacy-safe evidence: record ONLY booleans about the prompt — whether
    // the collated classical-text block reached the model. Never log content.
    let classical = null;
    try {
      const parsed = JSON.parse(body);
      const system = String(parsed?.messages?.[0]?.content || "");
      classical = system.includes("CLASSICAL TEXT") && system.includes("卦辞");
    } catch { /* malformed */ }
    fs.appendFileSync(REQUEST_LOG, JSON.stringify({ at: new Date().toISOString(), scenario: s, path: "/chat/completions", classicalTextInPrompt: classical }) + "\n");
  });
  logRequestLegacy(s);
  req.resume();

  if (s === "create500") {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "mock: model unavailable", code: 500 } }));
    return;
  }
  if (s === "slowfail") {
    setTimeout(() => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "mock: slow failure", code: 500 } }));
    }, 800);
    return;
  }

  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });

  if (s === "emptydone") {
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }
  if (s === "streambreak") {
    sseChunk(res, "partial content ");
    sseChunk(res, "before the cut");
    setTimeout(() => res.destroy(), 50); // client sees a mid-stream error
    return;
  }
  if (s === "slowok") {
    setTimeout(() => {
      sseChunk(res, "mock answer — slow ");
      sseChunk(res, "but complete");
      res.write("data: [DONE]\n\n");
      res.end();
    }, 800);
    return;
  }
  // ok
  sseChunk(res, "Mock answer part one. ");
  sseChunk(res, "Mock answer part two. ");
  sseChunk(res, "Mock answer complete.");
  res.write("data: [DONE]\n\n");
  res.end();
});

server.listen(PORT, () => console.log(`mock-azure listening on :${PORT} (scenario file: ${SCENARIO_FILE})`));
