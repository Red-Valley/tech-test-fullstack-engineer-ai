"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_USER_MESSAGE_LENGTH } from "@/lib/chat/request-limits";
import { useChat } from "./chat-provider";
import { MessageBubble } from "./message-bubble";

export function ChatView({ suggestions }: { suggestions: string[] }) {
  const { messages, streaming, send, retry, stop, reset } = useChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Follow the newest text, unless the reader has scrolled up to look at something.
  useEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTo({ top: list.scrollHeight });
  }, [messages]);

  function handleScroll() {
    const list = listRef.current;
    if (list) stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }

  function ask(question: string) {
    const text = question.trim();
    if (!text || streaming) return;
    stickToBottom.current = true;
    send(text);
    setDraft("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a line. Enter during IME composition (e.g. Japanese) must not send.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      ask(draft);
    }
  }

  return (
    <section className="flex h-[calc(100dvh-8rem)] min-h-[26rem] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight">Catalog assistant</h1>
          <p className="truncate text-xs text-slate-500">Answers are looked up live from the catalog, the same data as the dashboard.</p>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={messages.length === 0}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          New chat
        </button>
      </header>

      <div
        ref={listRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-busy={streaming}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
            <p className="text-lg font-semibold tracking-tight">Ask anything about the catalog</p>
            <p className="mt-1 text-sm text-slate-500">Revenue, downloads, ratings, genres, comparisons. Try one of these:</p>
            <div className="mt-4 flex w-full flex-col gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
              streaming={streaming}
              onRetry={retry}
            />
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={MAX_USER_MESSAGE_LENGTH}
            placeholder="Ask about revenue, downloads, ratings…"
            aria-label="Your question"
            className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className="h-11 shrink-0 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={draft.trim() === ""}
              className="h-11 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">Enter to send · Shift+Enter for a new line</p>
      </form>
    </section>
  );
}
