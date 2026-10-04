import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadPort } from "./config.ts";
import { answer, resolvePreferences } from "./assistant.ts";
import { InvalidEnsNameError } from "./ens.ts";
import { LlmUnavailableError } from "./llm.ts";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_QUESTION_CHARS = 2000;
const INDEX_PATH = fileURLToPath(new URL("../public/index.html", import.meta.url));

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new RangeError("Request body too large.");
    chunks.push(chunk as Buffer);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  if (typeof parsed !== "object" || parsed === null) throw new SyntaxError("Expected an object.");
  return parsed as Record<string, unknown>;
}

function publicView(r: Awaited<ReturnType<typeof resolvePreferences>>) {
  return {
    ensName: r.ensName,
    source: r.source,
    preferences: r.preferences,
    ignored: r.ignored,
    unknownKeys: r.unknownKeys,
  };
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(await readFile(INDEX_PATH));
    return;
  }

  if (req.method === "POST" && (url.pathname === "/api/preferences" || url.pathname === "/api/chat")) {
    const body = await readJson(req);
    const name = typeof body.name === "string" ? body.name : "";

    if (url.pathname === "/api/preferences") {
      send(res, 200, publicView(await resolvePreferences(name)));
      return;
    }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question || question.length > MAX_QUESTION_CHARS) {
      send(res, 400, { error: `Question must be 1-${MAX_QUESTION_CHARS} characters.` });
      return;
    }
    const result = await answer(name, question);
    send(res, 200, { ...publicView(result), answer: result.answer });
    return;
  }

  send(res, 404, { error: "Not found." });
}

const server = createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    if (err instanceof InvalidEnsNameError) return send(res, 400, { error: err.message });
    if (err instanceof RangeError) return send(res, 413, { error: err.message });
    if (err instanceof SyntaxError) return send(res, 400, { error: "Invalid JSON body." });
    if (err instanceof LlmUnavailableError) return send(res, 503, { error: err.message });
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return send(res, 504, { error: "The model took too long to respond." });
    }
    console.error(err);
    send(res, 502, { error: "Upstream lookup failed. Try again." });
  });
});

const port = loadPort();
server.listen(port, () => console.log(`portable-ai-preferences on http://localhost:${port}`));
