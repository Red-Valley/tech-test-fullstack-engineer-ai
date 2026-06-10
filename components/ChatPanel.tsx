"use client";

import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, Send } from "lucide-react";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  }

  return (
    <section className="mt-4 flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur lg:mt-0 lg:w-[40%]">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <div className="mb-2 inline-flex items-center rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300">
            <Bot className="mr-2 h-3.5 w-3.5" />
            AI Assistant
          </div>
          <h2 className="text-xl font-semibold text-white">Query Your Catalog</h2>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-950/50 p-3">
        {messages.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-white/10 bg-slate-800/70 p-4 text-sm text-slate-400">
            Ask the AI about games, genres, revenue, or downloads in the catalog.
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
              message.role === "user"
                ? "bg-cyan-500 text-slate-950"
                : "border border-white/10 bg-slate-800 text-slate-200"
            }`}>
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return message.role === "assistant" ? (
                    <div key={i} className="prose prose-invert prose-sm">
                      <ReactMarkdown>{part.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <div key={i}>{part.text}</div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Typing...
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the catalog..."
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-cyan-500 p-2.5 text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}