"use client";

import { useChat } from "@ai-sdk/react";
import { ArrowCounterClockwise, ArrowUp, ArrowUpRight, Sparkle, Stop } from "@phosphor-icons/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, type FormEvent, type Ref } from "react";
import type { ChatMessage } from "@/lib/ai/agent";
import { referencedGameIds } from "@/lib/ai/references";
import { MessageParts } from "./MessageParts";

const MAX_LENGTH = 2000;
const COUNTER_FROM = 1800;

const SUGGESTIONS = [
  "Which game made the most revenue last month?",
  "How many games are rated above 4?",
  "Compare revenue of Hollow Depths vs Stardust Farm.",
];

/** Route errors arrive as the JSON body text; show their message rather than raw JSON. */
function errorMessage(error: Error): string {
  try {
    return JSON.parse(error.message).error.message;
  } catch {
    return error.message || "Something went wrong.";
  }
}

type Props = {
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Games the latest answer is about; [] when there is no answer to point at. */
  onReferences?: (ids: number[]) => void;
};

export function ChatView({ className = "", inputRef, onReferences }: Props) {
  const { messages, setMessages, sendMessage, status, error, stop, regenerate, clearError } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const [stoppedId, setStoppedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && !busy;
  const lastMessage = messages.at(-1);

  // Scroll the message list itself; scrollIntoView would also scroll the page around the rail.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, status]);

  // Highlight follows the latest message: an answer's games, or nothing once a new question is asked.
  const referenced = lastMessage?.role === "assistant" ? referencedGameIds(lastMessage) : [];
  const referencedKey = referenced.join(",");
  useEffect(() => {
    onReferences?.(referencedKey ? referencedKey.split(",").map(Number) : []);
  }, [referencedKey, onReferences]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    setStoppedId(null);
    sendMessage({ text: text.trim() });
    setInput("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  function stopReply() {
    if (lastMessage?.role === "assistant") setStoppedId(lastMessage.id);
    stop();
  }

  async function newChat() {
    await stop();
    clearError();
    setMessages([]);
    setStoppedId(null);
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 pr-12 xl:pr-4">
        <Sparkle size={16} className="text-accent" aria-hidden />
        <h2 className="text-base">Assistant</h2>
        {messages.length > 0 && (
          <button type="button" onClick={newChat} className="btn btn-ghost ml-auto px-2 py-1 text-xs font-normal">
            <ArrowCounterClockwise size={12} aria-hidden />
            New chat
          </button>
        )}
      </div>
      <p className="px-4 pb-2.5 text-xs text-muted">
        Answers come from live lookups against the catalog. Games it mentions light up in the table.
      </p>
      <div className="rule-fade mx-4" />

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-3.5" aria-live="polite">
        {messages.length === 0 && !busy && (
          <div className="mt-auto flex flex-col gap-2">
            <h3 className="text-[13px] tracking-[.08em] text-muted uppercase">Try asking</h3>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="btn btn-secondary justify-between px-2.5 py-2 text-left text-[13px] font-normal whitespace-normal"
              >
                {suggestion}
                <ArrowUpRight size={13} className="shrink-0 opacity-60" aria-hidden />
              </button>
            ))}
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="max-w-[88%] self-end rounded-md bg-neutral-900 px-[11px] py-[7px] text-[13px]/[1.5] shadow-sm">
              {message.parts.map((part, index) => (part.type === "text" ? <span key={index}>{part.text}</span> : null))}
            </div>
          ) : (
            <div key={message.id} className="flex flex-col gap-[7px]">
              <MessageParts message={message} streaming={status === "streaming" && message === lastMessage} />
              {(message.id === stoppedId || (status === "error" && message === lastMessage)) && (
                <p className="text-[11px] text-muted italic">Stopped — incomplete answer</p>
              )}
            </div>
          ),
        )}

        {status === "submitted" && <p className="text-[13px] text-muted">Thinking…</p>}

        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-accent-700 bg-accent-900 px-3 py-2.5 text-[13px] text-accent-200">
            <span>{errorMessage(error)}</span>
            <button type="button" onClick={() => regenerate()} className="btn btn-secondary shrink-0 px-2.5 py-1 text-xs">
              Retry
            </button>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3.5">
        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={MAX_LENGTH}
            placeholder="Ask about the games catalog…"
            aria-label="Message"
            className="input min-h-9 flex-1 bg-bg"
          />
          {status === "streaming" ? (
            <button type="button" onClick={stopReply} aria-label="Stop" className="btn btn-secondary size-9 p-0">
              <Stop size={16} aria-hidden />
            </button>
          ) : (
            <button type="submit" disabled={!canSend} aria-label="Send" className="btn btn-primary size-9 p-0">
              <ArrowUp size={16} aria-hidden />
            </button>
          )}
        </div>
        {input.length >= COUNTER_FROM && (
          <p className="self-end text-xs text-muted tabular-nums">
            {input.length} / {MAX_LENGTH}
          </p>
        )}
      </form>
    </div>
  );
}
