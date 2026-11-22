'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Sparkles, AlertCircle, Wrench, Loader2 } from 'lucide-react';

export function ChatPanel() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isGenerating = status === 'submitted' || status === 'streaming';

  const quickPrompts = [
    {
      label: 'Most revenue last month?',
      prompt: 'Which game made the most revenue last month?',
    },
    {
      label: 'Games rated > 4?',
      prompt: 'How many games are rated above 4?',
    },
    {
      label: 'Compare Celeste vs Hollow Knight',
      prompt: 'Compare revenue of Celeste vs Hollow Knight.',
    },
  ];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    sendMessage({ text: input.trim() });
    setInput('');
  };

  const handleQuickPrompt = (promptText: string) => {
    if (isGenerating) return;
    sendMessage({ text: promptText });
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Catalog Assistant</h3>
            <p className="text-xs text-slate-400">Database-backed AI chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Thinking...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Ready</span>
            </span>
          )}
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap gap-1.5">
        <span className="text-xs text-slate-500 inline-flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-indigo-400" /> Suggested:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickPrompt(qp.prompt)}
            disabled={isGenerating}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors disabled:opacity-40"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-3 mx-3 mt-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-200">AI Request Notice</p>
            <p className="mt-0.5 leading-relaxed">
              {error.message ||
                'Unable to contact AI service. Ensure GOOGLE_GENERATIVE_AI_API_KEY is configured in .env.local.'}
            </p>
          </div>
        </div>
      )}

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Bot className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-300">Ask the Catalog Assistant</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
              Ask about top earners, filter by rating, compare games, or inspect catalog-wide statistics.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role !== 'user' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-3.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/80 shadow-sm'
                }`}
              >
                {/* Render Parts (Text, Tool Invocations) */}
                {m.parts && m.parts.length > 0 ? (
                  m.parts.map((part, pIdx) => {
                    if (part.type === 'text') {
                      return (
                        <p key={pIdx} className="whitespace-pre-wrap leading-relaxed">
                          {part.text}
                        </p>
                      );
                    }
                    if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
                      return (
                        <div
                          key={pIdx}
                          className="my-2 py-1 px-2.5 rounded bg-slate-900/80 border border-slate-700/70 text-xs font-mono text-cyan-400 flex items-center gap-1.5"
                        >
                          <Wrench className="w-3 h-3 text-cyan-400" />
                          <span>Tool Invocation: {part.type}</span>
                        </div>
                      );
                    }
                    return null;
                  })
                ) : 'content' in m && typeof (m as Record<string, unknown>).content === 'string' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {String((m as Record<string, unknown>).content)}
                  </p>
                ) : null}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/40 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the games catalog..."
          disabled={isGenerating}
          className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isGenerating || !input.trim()}
          aria-label="Send message"
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
