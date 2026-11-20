import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEventParser, type ChatEvent } from "@/lib/chat/protocol";
import { createGamesRepository, type GamesRepository } from "@/lib/games/repository";
import { callTools, say, scriptedAnthropic } from "@/test/anthropic-mock";

// Replaced: the database accessor (fresh seeded in-memory DB per test) and the Anthropic client (scripted
// network). Everything else - validation, system prompt, tools, the tool loop, streaming - is the real code.
let repo: GamesRepository;
let client: Anthropic;
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getGames: () => repo,
}));
vi.mock("@/lib/chat/anthropic", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/anthropic")>()),
  getClient: () => client,
}));

import { openDatabase } from "@/lib/db";
import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const ask = (question: string) => ({ messages: [{ role: "user", content: question }] });

async function readEvents(response: Response): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  createEventParser((event) => events.push(event))(await response.text());
  return events;
}

beforeEach(() => {
  repo = createGamesRepository(openDatabase(":memory:"));
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("ANTHROPIC_MODEL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/chat: rejecting bad requests", () => {
  it("answers 400 for a body that is not JSON", async () => {
    const response = await post("{nope");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Request body must be valid JSON");
  });

  it("answers 400 with the problem for a malformed conversation", async () => {
    const response = await post({ messages: [{ role: "assistant", content: "I speak first" }] });
    expect(response.status).toBe(400);
    expect((await response.json()).issues[0].message).toMatch(/start and end with a user message/);
  });

  it("answers 503 with setup instructions when no API key is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "");

    const response = await post(ask("hi"));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/ANTHROPIC_API_KEY in \.env\.local/);
  });
});

describe("POST /api/chat: answering", () => {
  it("streams a tool-assisted answer as server-sent events, ending with done", async () => {
    const scripted = scriptedAnthropic([
      callTools({
        id: "toolu_1",
        name: "aggregate_games",
        input: { function: "count", conditions: [{ field: "average_rating", operator: "gt", value: 4 }] },
      }),
      say("15 games are rated above 4."),
    ]);
    client = scripted.client;

    const response = await post(ask("How many games are rated above 4?"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("Cache-Control")).toContain("no-cache");

    const events = await readEvents(response);
    expect(events.map((e) => e.type)).toEqual([
      "tool_call",
      "tool_result",
      ...Array(events.filter((e) => e.type === "text").length).fill("text"),
      "done",
    ]);

    const result = events.find((e) => e.type === "tool_result") as Extract<ChatEvent, { type: "tool_result" }>;
    const expected = repo.list({ numeric: [{ field: "average_rating", op: "gt", value: 4 }] }).total;
    expect(result.ok).toBe(true);
    expect((result.output as { results: { value: number }[] }).results[0].value).toBe(expected);
  });

  it("gives the model a summary of the catalog, never the games themselves", async () => {
    const scripted = scriptedAnthropic([say("ok")]);
    client = scripted.client;

    await readEvents(await post(ask("hello")));

    const [request] = scripted.requests;
    expect(request.system).toContain("The catalog has 24 games");
    expect(request.system).toContain('"Card Game", "Horror"');
    // The full catalog must not be dumped into the prompt.
    expect(request.system).not.toContain("Echoes of Halcyon");
    expect(JSON.stringify(request.messages)).not.toContain("Echoes of Halcyon");
    expect(request.tools).toHaveLength(3);
  });

  it("uses claude-opus-5-5 unless ANTHROPIC_MODEL says otherwise", async () => {
    const first = scriptedAnthropic([say("ok")]);
    client = first.client;
    await readEvents(await post(ask("hello")));
    expect(first.requests[0].model).toBe("claude-opus-5-5");

    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-5-5");
    const second = scriptedAnthropic([say("ok")]);
    client = second.client;
    await readEvents(await post(ask("hello")));
    expect(second.requests[0].model).toBe("claude-haiku-5-5");
  });

  it("carries earlier turns of the conversation to the model", async () => {
    const scripted = scriptedAnthropic([say("ok")]);
    client = scripted.client;

    await readEvents(
      await post({
        messages: [
          { role: "user", content: "Top game?" },
          { role: "assistant", content: "Echoes of Halcyon." },
          { role: "user", content: "And its developer?" },
        ],
      }),
    );
    expect(scripted.requests[0].messages).toHaveLength(3);
  });

  it("reports an API failure as an error event, not a broken response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { apiError } = await import("@/test/anthropic-mock");
    client = scriptedAnthropic([apiError(401, "authentication_error", "invalid x-api-key")]).client;

    const response = await post(ask("hello"));
    expect(response.status).toBe(200); // the stream was already open; the failure travels inside it
    const events = await readEvents(response);
    expect(events.map((e) => e.type)).toEqual(["error", "done"]);
    expect((events[0] as { message: string }).message).toMatch(/rejected the API key/);
  });
});
