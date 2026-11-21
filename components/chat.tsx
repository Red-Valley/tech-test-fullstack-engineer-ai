"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatEvent, ChatHistory } from "@/lib/chat/events";

type ToolCall = { name: string; input: unknown };
type DisplayMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  tools: ToolCall[];
};

/** A short, readable summary of a tool call's arguments for the chip shown above the answer. */
function summarizeInput(input: unknown): string {
  const text = JSON.stringify(input ?? {});
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

export function Chat({ samples }: { samples: string[] }) {
  // `messages` is what the user sees. `history` is the Messages API conversation (including thinking and
  // tool blocks) that the server returns in its `done` event. It is stored as is and replayed unchanged.
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatHistory>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Bumped by "New chat", so a request that was still running cannot write into the new conversation. */
  const generation = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming, error]);

  function updateLast(update: (message: DisplayMessage) => DisplayMessage) {
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? update(m) : m)));
  }

  async function send(text: string) {
    const content = text.trim();
    // Guard with a ref, not `streaming`: two quick submits can both run before React re-renders.
    if (!content || abortRef.current) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const startedIn = generation.current;
    // False once "New chat" was clicked: this request must not touch the new conversation.
    const isCurrent = () => generation.current === startedIn;
    let completed = false;
    let failed = false;

    setError(null);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text: content, tools: [] },
      { id: nextId.current++, role: "assistant", text: "", tools: [] },
    ]);

    function handleEvent(event: ChatEvent) {
      if (!isCurrent()) return;
      switch (event.type) {
        case "text":
          updateLast((m) => ({ ...m, text: m.text + event.delta }));
          break;
        case "tool_call":
          updateLast((m) => ({ ...m, tools: [...m.tools, { name: event.name, input: event.input }] }));
          break;
        case "done":
          completed = true;
          setHistory(event.messages);
          break;
        case "error":
          failed = true;
          setError(event.message);
          break;
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content }] }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) handleEvent(JSON.parse(line) as ChatEvent);
        }
      }
      // The stream must end with `done` or `error`. Anything else means the connection was cut.
      if (!completed && !failed && isCurrent()) setError("The response ended unexpectedly. Try again.");
    } catch (err) {
      if (!controller.signal.aborted && isCurrent()) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      if (isCurrent()) {
        if (!completed) {
          // The server only returns the conversation in `done`, so an unfinished exchange is not part of the
          // replayed history. Remove it from the screen too, and put the question back so it can be re-sent.
          setMessages((prev) => prev.slice(0, -2));
          setInput((prev) => prev || content);
        }
        setStreaming(false);
        abortRef.current = null;
      }
    }
  }

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    generation.current += 1;
    setMessages([]);
    setHistory([]);
    setError(null);
    setInput("");
    setStreaming(false);
  }

  const waitingForText = streaming && messages[messages.length - 1]?.text === "";

  return (
    <div className="flex min-h-[24rem] flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Ask about the catalog</h2>
          <p className="text-xs text-slate-500">Answers come from tool calls against the games database.</p>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={messages.length === 0 && !streaming}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          New chat
        </button>
      </div>

      {/* role="log" announces new messages politely. tabIndex makes the scrollable area reachable by keyboard. */}
      <div
        role="log"
        aria-label="Conversation"
        tabIndex={0}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500"
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-md space-y-3 pt-8 text-center">
            <p className="text-sm text-slate-600">Try one of these questions:</p>
            <div className="flex flex-col gap-2">
              {samples.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => send(sample)}
                  disabled={streaming}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%] space-y-2">
              {/* Tool calls come first: the assistant looks things up, then answers. */}
              {message.tools.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {message.tools.map((tool, index) => (
                    <li
                      key={index}
                      title={JSON.stringify(tool.input, null, 2)}
                      className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-600"
                    >
                      <span className="font-semibold text-indigo-700">{tool.name}</span> {summarizeInput(tool.input)}
                    </li>
                  ))}
                </ul>
              )}
              {message.text && (
                <div
                  className={
                    message.role === "user"
                      ? "whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2 text-sm text-white"
                      : "whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2 text-sm text-slate-900"
                  }
                >
                  {message.text}
                </div>
              )}
            </div>
          </div>
        ))}

        {waitingForText && <p className="text-xs text-slate-500">Thinking...</p>}
        <div ref={bottomRef} />
      </div>

      {/* Outside the log, so the alert is announced once. */}
      {error && (
        <div
          role="alert"
          className="mx-3 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 border-t border-slate-200 p-3"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Ask a question about the games..."
          aria-label="Message"
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        {streaming ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
