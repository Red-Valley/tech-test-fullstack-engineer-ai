import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { createGamesRepository } from "@/lib/games/repository";
import { callTools, modelTurn, say, scriptedAnthropic } from "@/test/anthropic-mock";
import { runChat } from "./agent";
import type { ChatEvent } from "./protocol";
import { createToolBox } from "./tools";

const QUESTION = "Which game made the most revenue last month?";

let tools: ReturnType<typeof createToolBox>;
beforeEach(() => {
  tools = createToolBox(createGamesRepository(openDatabase(":memory:")));
});

async function chat(turns: Parameters<typeof scriptedAnthropic>[0], options: { maxSteps?: number } = {}) {
  const { client, requests } = scriptedAnthropic(turns);
  const events: ChatEvent[] = [];
  await runChat({
    client,
    model: "claude-test-model",
    system: "SYSTEM PROMPT",
    messages: [{ role: "user", content: QUESTION }],
    tools,
    send: (event) => events.push(event),
    ...options,
  });
  return { events, requests };
}

const typesOf = (events: ChatEvent[]) => [...new Set(events.map((event) => event.type))];
const textOf = (events: ChatEvent[]) =>
  events.flatMap((event) => (event.type === "text" ? [event.delta] : [])).join("");

describe("runChat: a plain answer", () => {
  it("streams the text in pieces and calls the API once", async () => {
    const { events, requests } = await chat([say("Echoes of Halcyon, with $203,300.")]);

    expect(textOf(events)).toBe("Echoes of Halcyon, with $203,300.");
    expect(events.filter((e) => e.type === "text").length, "arrives as several deltas, not one blob").toBeGreaterThan(1);
    expect(typesOf(events)).toEqual(["text"]);
    expect(requests).toHaveLength(1);
  });

  it("builds the request the API expects", async () => {
    const { requests } = await chat([say("ok")]);
    const [request] = requests;

    expect(request.model).toBe("claude-test-model");
    expect(request.stream).toBe(true);
    expect(request.system).toBe("SYSTEM PROMPT");
    expect(request.max_tokens).toBe(16000);
    expect(request.messages).toEqual([{ role: "user", content: QUESTION }]);
    expect(request.tools.map((tool) => tool.name)).toEqual(["search_games", "aggregate_games", "compare_games"]);
    // Parameters that newer Claude models reject must never be sent.
    for (const forbidden of ["temperature", "top_p", "top_k", "tool_choice", "thinking"]) {
      expect(request, forbidden).not.toHaveProperty(forbidden);
    }
  });
});

describe("runChat: tool calling", () => {
  const lookup = { id: "toolu_1", name: "search_games", input: { sort_by: "monthly_revenue_usd", sort_order: "desc", limit: 1 } };

  it("runs the tool the model asked for, then lets the model answer from the result", async () => {
    const { events, requests } = await chat([callTools(lookup), say("Echoes of Halcyon led last month.")]);

    // What the browser sees, in order: the call, its result, then the answer.
    expect(typesOf(events)).toEqual(["tool_call", "tool_result", "text"]);
    expect(events[0]).toEqual({ type: "tool_call", id: "toolu_1", name: "search_games", input: lookup.input });
    expect(events[1]).toMatchObject({ type: "tool_result", id: "toolu_1", ok: true });
    expect((events[1] as { output: { games: { title: string }[] } }).output.games[0].title).toBe("Echoes of Halcyon");
    expect(textOf(events)).toBe("Echoes of Halcyon led last month.");

    // What was sent back to the model: its own tool_use turn, then the matching tool_result.
    expect(requests).toHaveLength(2);
    const [, second] = requests;
    expect(second.messages).toEqual([
      { role: "user", content: QUESTION },
      { role: "assistant", content: [expect.objectContaining({ type: "tool_use", id: "toolu_1", name: "search_games", input: lookup.input })] },
      { role: "user", content: [expect.objectContaining({ type: "tool_result", tool_use_id: "toolu_1", is_error: false })] },
    ]);
    const result = (second.messages[2].content as { content: string }[])[0].content;
    expect(JSON.parse(result).games[0].title).toBe("Echoes of Halcyon");
  });

  it("answers parallel tool calls in a single user message, in order", async () => {
    const { events, requests } = await chat([
      callTools(
        { id: "toolu_a", name: "aggregate_games", input: { function: "count" } },
        { id: "toolu_b", name: "compare_games", input: { titles: ["Tidebound", "Lanternfall"] } },
      ),
      say("Done."),
    ]);

    expect(events.filter((e) => e.type === "tool_call").map((e) => (e as { id: string }).id)).toEqual(["toolu_a", "toolu_b"]);
    const resultsMessage = requests[1].messages[2];
    expect(resultsMessage.role).toBe("user");
    expect((resultsMessage.content as { tool_use_id: string }[]).map((block) => block.tool_use_id)).toEqual(["toolu_a", "toolu_b"]);
  });

  it("hands a bad tool call back as an error the model can recover from", async () => {
    const { events, requests } = await chat([
      callTools({ id: "toolu_bad", name: "search_games", input: { limit: 999 } }),
      callTools({ id: "toolu_good", name: "search_games", input: { limit: 1 } }),
      say("Recovered."),
    ]);

    const results = events.filter((e) => e.type === "tool_result");
    expect(results.map((e) => (e as { ok: boolean }).ok)).toEqual([false, true]);
    expect(requests[1].messages[2].content).toEqual([expect.objectContaining({ tool_use_id: "toolu_bad", is_error: true })]);
    expect(textOf(events)).toBe("Recovered.");
  });

  it("passes thinking blocks back untouched, as the API requires inside a tool loop", async () => {
    // Opus 5.5 always thinks. Its thinking block (empty text, real signature) precedes the tool call and
    // must reappear, unchanged and in order, in the follow-up request.
    const { events, requests } = await chat([
      modelTurn(
        [
          { type: "thinking", thinking: "", signature: "sig-abc123" },
          { type: "tool_use", id: "toolu_t", name: "search_games", input: { limit: 1 } },
        ],
        "tool_use",
      ),
      say("Done."),
    ]);

    expect(requests[1].messages[1].content).toEqual([
      expect.objectContaining({ type: "thinking", signature: "sig-abc123" }),
      expect.objectContaining({ type: "tool_use", id: "toolu_t" }),
    ]);
    expect(typesOf(events)).toEqual(["tool_call", "tool_result", "text"]); // thinking itself is never shown
  });

  it("copes with a tool the model invented", async () => {
    const { events } = await chat([callTools({ id: "toolu_x", name: "delete_all_games", input: {} }), say("Sorry.")]);
    expect(events.find((e) => e.type === "tool_result")).toMatchObject({ ok: false, output: { error: expect.stringContaining("Unknown tool") } });
  });
});

describe("runChat: stopping safely", () => {
  it("stops at a refusal and says so", async () => {
    const { events, requests } = await chat([modelTurn([], "refusal")]);
    expect(events).toEqual([{ type: "error", message: "The model declined to answer that request." }]);
    expect(requests).toHaveLength(1);
  });

  it("never runs a tool call that was cut off by the length limit", async () => {
    const { events, requests } = await chat([
      modelTurn([{ type: "tool_use", id: "toolu_cut", name: "search_games", input: { limit: 1 } }], "max_tokens"),
    ]);
    expect(typesOf(events)).toEqual(["error"]);
    expect(events.some((e) => e.type === "tool_call")).toBe(false);
    expect(requests).toHaveLength(1);
  });

  it("gives up after maxSteps rounds instead of looping forever", async () => {
    const forever = callTools({ id: "toolu_loop", name: "search_games", input: { limit: 1 } });
    const { events, requests } = await chat([forever], { maxSteps: 3 });

    expect(requests).toHaveLength(3);
    expect(events.filter((e) => e.type === "tool_call")).toHaveLength(3);
    expect(events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("more lookups") });
  });
});
