import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/chat/route";
import type { ChatEvent, ChatHistory } from "../lib/chat/events";
import { getDb } from "../lib/db";
import { createRepository } from "../lib/games/repository";
import { startMockAnthropic } from "../scripts/mock-anthropic.mjs";

// These tests run the real chat route, tool runner, tools, and SQLite database against an offline mock of the
// Anthropic Messages API (scripts/mock-anthropic.mjs). No API key or credits are needed. They show the
// plumbing works. They cannot show how the real model chooses tool arguments or words an answer.

type Mock = Awaited<ReturnType<typeof startMockAnthropic>>;

const globals = globalThis as { gamesDb?: { close(): void } };
const previousPath = process.env.DATABASE_PATH;
const previousDb = globals.gamesDb;
let dir: string;
let mock: Mock;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "games-chat-"));
  process.env.DATABASE_PATH = join(dir, "games.db");
  delete globals.gamesDb;
  mock = await startMockAnthropic();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("ANTHROPIC_BASE_URL", mock.url);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await mock.close();
  globals.gamesDb?.close();
  if (previousDb) globals.gamesDb = previousDb;
  else delete globals.gamesDb;
  if (previousPath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousPath;
  rmSync(dir, { recursive: true, force: true });
});

/** Sends one question, as the browser does, and returns the streamed events. */
async function ask(history: ChatHistory, question: string): Promise<ChatEvent[]> {
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [...history, { role: "user", content: question }] }),
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toMatch(/application\/x-ndjson/);
  return (await response.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ChatEvent);
}

const answerOf = (events: ChatEvent[]) => events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
const typesOf = (events: ChatEvent[]) => events.map((e) => e.type);
const toolCallOf = (events: ChatEvent[]) => events.find((e) => e.type === "tool_call");
const historyOf = (events: ChatEvent[]) => {
  const done = events.find((e) => e.type === "done");
  if (done?.type !== "done") throw new Error("the stream did not end with a done event");
  return done.messages;
};
const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

describe("POST /api/chat against the offline mock", () => {
  const games = () => createRepository(getDb()).list();
  const byRevenue = () => [...games()].sort((a, b) => b.monthly_revenue_usd - a.monthly_revenue_usd);

  it("answers the most-revenue question through a query_games call", async () => {
    const top = byRevenue()[0];
    const events = await ask([], "Which game made the most revenue last month?");

    expect(typesOf(events)[0]).toBe("text");
    expect(typesOf(events).indexOf("tool_call")).toBeGreaterThan(0);
    expect(typesOf(events).at(-1)).toBe("done");
    expect(toolCallOf(events)).toMatchObject({
      name: "query_games",
      input: { sort_by: "monthly_revenue_usd", order: "desc", limit: 1 },
    });
    // The answer is computed from the real tool result, so it matches the database.
    expect(answerOf(events)).toContain(`${top.title} made the most revenue last month: ${dollars(top.monthly_revenue_usd)}`);
  });

  it("answers the rated-above-4 question through an aggregate_games call", async () => {
    const count = games().filter((g) => g.average_rating > 4).length;
    const events = await ask([], "How many games are rated above 4?");

    expect(toolCallOf(events)).toMatchObject({ name: "aggregate_games", input: { metric: "count" } });
    expect(answerOf(events)).toContain(`${count} games are rated above 4`);
  });

  it("answers the comparison question with both games' revenue", async () => {
    const [a, b] = byRevenue();
    const events = await ask([], `Compare revenue of ${a.title} vs ${b.title}.`);

    expect(toolCallOf(events)).toMatchObject({ name: "query_games", input: { filters: { titles: [a.title, b.title] } } });
    expect(answerOf(events)).toContain(`${a.title}: ${dollars(a.monthly_revenue_usd)}`);
    expect(answerOf(events)).toContain(`${b.title}: ${dollars(b.monthly_revenue_usd)}`);
  });

  it("streams the answer in several pieces and separates text blocks", async () => {
    const events = await ask([], "Which game made the most revenue last month?");
    expect(typesOf(events).filter((t) => t === "text").length).toBeGreaterThan(5);
    // The text before the tool call and the final answer are separate blocks, kept apart by a blank line.
    expect(answerOf(events)).toMatch(/catalog\.\n\n.+ made the most revenue/);
  });

  it("replays the returned conversation unchanged on the next turn", async () => {
    const first = await ask([], "Which game made the most revenue last month?");
    const history = historyOf(first);
    expect(history.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);

    const sentBefore = mock.requests.length;
    const second = await ask(history, "How many games are rated above 4?");
    const firstRequestOfSecondTurn = mock.requests[sentBefore].body;

    // Everything the model returned earlier (thinking and tool blocks included) goes back as it came.
    expect(firstRequestOfSecondTurn.messages.slice(0, history.length)).toEqual(history);
    const blockTypes = firstRequestOfSecondTurn.messages.flatMap((m: { content: unknown }) =>
      Array.isArray(m.content) ? m.content.map((b: { type: string }) => b.type) : [],
    );
    expect(blockTypes).toEqual(expect.arrayContaining(["thinking", "tool_use", "tool_result"]));
    expect(historyOf(second).slice(0, history.length)).toEqual(history);
  });

  it("calls the model with the intended request settings", async () => {
    const sentBefore = mock.requests.length;
    await ask([], "Which game made the most revenue last month?");
    const { body, beta } = mock.requests[sentBefore];

    expect(body).toMatchObject({
      model: "claude-opus-5-5",
      stream: true,
      output_config: { effort: "low" },
      thinking: { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } },
      fallbacks: "default",
    });
    expect(body.thread).toBeUndefined();
    expect(body.tools.map((t: { name: string }) => t.name)).toEqual(["query_games", "aggregate_games"]);
    expect(beta).toContain("server-side-fallback-2026-07-01");
    expect(beta).toContain("thinking-binding-controls-2026-08-01");
    expect(beta).not.toContain("message-threads");
  });

  it("tells an unknown question apart: no tool call, a short notice", async () => {
    const events = await ask([], "What is the weather?");
    expect(typesOf(events)).not.toContain("tool_call");
    expect(answerOf(events)).toMatch(/offline mock/);
    expect(typesOf(events).at(-1)).toBe("done");
  });

  it("reports an empty Anthropic balance with a friendly error and no done event", async () => {
    const failing = await startMockAnthropic({
      failWith: {
        status: 400,
        message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
      },
    });
    vi.stubEnv("ANTHROPIC_BASE_URL", failing.url);
    try {
      const events = await ask([], "Which game made the most revenue last month?");
      expect(typesOf(events)).not.toContain("done");
      const last = events.at(-1);
      expect(last).toMatchObject({ type: "error" });
      expect(last?.type === "error" && last.message).toMatch(/no API credits.*npm run dev:mock/);
    } finally {
      vi.stubEnv("ANTHROPIC_BASE_URL", mock.url);
      await failing.close();
    }
  });
});
