import { describe, expect, it, vi } from "vitest";
import { createEventParser, type ChatEvent } from "./protocol";
import { eventStreamResponse } from "./stream";

async function readEvents(response: Response): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  createEventParser((event) => events.push(event))(await response.text());
  return events;
}

const neverAborted = () => new AbortController().signal;

describe("eventStreamResponse", () => {
  it("sends streaming-friendly headers", () => {
    const response = eventStreamResponse(async () => {}, neverAborted());
    expect(response.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
  });

  it("delivers the job's events in order and always finishes with done", async () => {
    const response = eventStreamResponse(async (send) => {
      send({ type: "text", delta: "a" });
      send({ type: "text", delta: "b" });
    }, neverAborted());

    expect(await readEvents(response)).toEqual([
      { type: "text", delta: "a" },
      { type: "text", delta: "b" },
      { type: "done" },
    ]);
  });

  it("really streams: the first event is readable while the job is still running", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => (finish = resolve));
    const response = eventStreamResponse(async (send) => {
      send({ type: "text", delta: "early" });
      await gate;
    }, neverAborted());

    const reader = response.body!.getReader();
    const first = await reader.read(); // would hang forever if the response were buffered until the job ended
    expect(new TextDecoder().decode(first.value)).toContain('"delta":"early"');

    finish();
    await reader.cancel();
  });

  it("turns a failing job into an error event followed by done, without leaking details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = eventStreamResponse(async (send) => {
      send({ type: "text", delta: "partial" });
      throw new Error("secret internals");
    }, neverAborted());

    const events = await readEvents(response);
    expect(events.map((e) => e.type)).toEqual(["text", "error", "done"]);
    expect(JSON.stringify(events)).not.toContain("secret internals");
    expect(consoleError).toHaveBeenCalled();
  });

  it("aborts the job and stops writing when the browser disconnects mid-stream", async () => {
    let jobSignal!: AbortSignal;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const finished: string[] = [];

    const response = eventStreamResponse(async (send, signal) => {
      jobSignal = signal;
      send({ type: "text", delta: "first" });
      await gate;
      send({ type: "text", delta: "after the browser left" }); // must be a harmless no-op, not an exception
      finished.push("job completed normally");
    }, neverAborted());

    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();

    expect(jobSignal.aborted).toBe(true);
    release();
    await vi.waitFor(() => expect(finished).toEqual(["job completed normally"]));
  });

  it("forwards the request's own abort signal to the job", async () => {
    const request = new AbortController();
    let jobSignal!: AbortSignal;

    const response = eventStreamResponse(async (_send, signal) => {
      jobSignal = signal;
      request.abort();
    }, request.signal);

    await readEvents(response);
    expect(jobSignal.aborted).toBe(true);
  });

  it("stays quiet about errors caused by the client leaving", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new AbortController();

    const response = eventStreamResponse(async () => {
      request.abort();
      throw new Error("request was aborted");
    }, request.signal);

    expect((await readEvents(response)).map((e) => e.type)).toEqual(["done"]);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
