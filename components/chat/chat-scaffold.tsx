"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { isTextUIPart, isToolOrDynamicToolUIPart } from "ai";
import AnswerCard from "@/components/chat/answer-card";
import type { CatalogAnswer } from "@/lib/games/answer-types";

const EXAMPLE_PROMPTS = [
  "Which game made the most revenue?",
  "How many games are rated above 4?",
  "Compare revenue of two games",
];

export default function ChatScaffold() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Chat messages"
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <p className="mb-3 text-sm font-medium text-neutral-600">
              Ask about your catalog
            </p>
            <ul className="space-y-1">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <li key={prompt} className="text-xs text-neutral-400">
                  &ldquo;{prompt}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((message) => {
          const lastMessageId = messages[messages.length - 1]?.id;

          const hasRespondOutput =
            message.role === "assistant" &&
            message.parts.some(
              (p) =>
                isToolOrDynamicToolUIPart(p) &&
                (p.type === "tool-respond" ||
                  (p.type === "dynamic-tool" &&
                    "toolName" in p &&
                    p.toolName === "respond")) &&
                p.state === "output-available"
            );

          const isCurrentlyStreaming =
            isStreaming && message.id === lastMessageId;

          const hasAnyToolPart =
            message.role === "assistant" &&
            message.parts.some((p) => isToolOrDynamicToolUIPart(p));

          return (
          <div key={message.id} className="flex flex-col gap-1">
            {message.parts.map((part, i) => {
              if (isTextUIPart(part)) {
                if (message.role === "assistant" && (hasRespondOutput || isCurrentlyStreaming)) {
                  return null;
                }
                return (
                  <div
                    key={i}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "rounded-br-sm bg-sky-600 text-white"
                          : "rounded-bl-sm bg-neutral-100 text-neutral-800"
                      }`}
                    >
                      {part.text}
                    </div>
                  </div>
                );
              }

              if (isToolOrDynamicToolUIPart(part)) {
                const isRespond =
                  (part.type === "tool-respond") ||
                  (part.type === "dynamic-tool" && "toolName" in part && part.toolName === "respond");

                if (isRespond) {
                  if (part.state === "output-available") {
                    return (
                      <AnswerCard
                        key={i}
                        answer={part.output as CatalogAnswer}
                      />
                    );
                  }
                  if (part.state === "input-streaming" || part.state === "input-available") {
                    return (
                      <div key={i} className="flex justify-start">
                        <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500">
                          <span
                            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400"
                            aria-hidden="true"
                          />
                          Preparing response&hellip;
                        </div>
                      </div>
                    );
                  }
                  return null;
                }

                const isPending =
                  part.state === "input-streaming" || part.state === "input-available";
                if (!isPending) return null;
                return (
                  <div key={i} className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500">
                      <span
                        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
                        aria-hidden="true"
                      />
                      Querying catalog&hellip;
                    </div>
                  </div>
                );
              }

              return null;
            })}
            {isCurrentlyStreaming && !hasAnyToolPart && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500">
                  <span
                    className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
                    aria-hidden="true"
                  />
                  Generating response&hellip;
                </div>
              </div>
            )}
          </div>
          );
        })}

        {error && (
          <div role="alert" className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              Something went wrong. Please try again.
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            ref={inputRef}
            id="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your catalog…"
            disabled={isStreaming}
            className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            aria-label="Send message"
            className="flex min-h-11 min-w-16 items-center justify-center rounded-md bg-sky-600 px-3 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
