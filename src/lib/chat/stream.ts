import { friendlyError } from "./errors";
import { encodeEvent, type ChatEvent } from "./protocol";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  // no-transform stops proxies from buffering or compressing the stream, which would defeat streaming.
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

/**
 * Wraps a long-running job as a streaming SSE response. The job pushes events with `send`; this takes care
 * of the plumbing around it:
 *  - an error becomes a final `error` event (not a broken connection),
 *  - `done` is always the last event,
 *  - if the browser goes away, the job's `signal` fires so upstream work stops, and nothing more is written.
 */
export function eventStreamResponse(
  job: (send: (event: ChatEvent) => void, signal: AbortSignal) => Promise<void>,
  requestSignal: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  requestSignal.addEventListener("abort", () => abort.abort(), { once: true });
  let open = true;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => {
        if (open) controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      try {
        await job(send, abort.signal);
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error("Chat request failed:", error);
          send({ type: "error", message: friendlyError(error) });
        }
      } finally {
        send({ type: "done" });
        if (open) {
          open = false;
          controller.close();
        }
      }
    },
    cancel() {
      open = false;
      abort.abort();
    },
  });

  return new Response(body, { headers: SSE_HEADERS });
}
