'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Bot, Loader2, Send, Sparkles, Trash2, User } from 'lucide-react';
import type { ChatStreamEvent } from '@/types/game';

const MarkdownMessage = dynamic(() => import('./MarkdownMessage').then((m) => m.MarkdownMessage), {
    loading: () => <span className="text-xs text-zinc-400">Formatting...</span>,
});

interface ChatPanelProps {
    onCatalogMutated?: () => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    isStreaming?: boolean;
}

const MODEL_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'Auto (Gemini 3 Flash Preview)' },
    { value: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview' },
    { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite' },
    { value: 'gemini-3.7-flash', label: 'gemini-3.7-flash' },
    { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
];

const STARTER_PROMPTS = [
    'Which game made the most revenue last month?',
    'How many games are rated above 4?',
    'Compare revenue of Hades II vs Balatro',
    'Break down revenue by genre',
];

const MUTATING_TOOLS = new Set(['add_or_update_game', 'create_game', 'update_game', 'delete_game']);

export function ChatPanel({ onCatalogMutated }: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [errorBanner, setErrorBanner] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const handleClear = () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsStreaming(false);
        setMessages([]);
        setErrorBanner(null);
    };

    const sendMessage = async (rawText: string) => {
        const text = rawText.trim();
        if (!text || isStreaming) return;

        setErrorBanner(null);
        setInput('');

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
        };

        const assistantId = `assistant-${Date.now()}`;
        const assistantPlaceholder: ChatMessage = {
            id: assistantId,
            role: 'assistant',
            content: '',
            isStreaming: true,
        };

        const conversationHistory = [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
        }));

        setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
        setIsStreaming(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: conversationHistory,
                    ...(selectedModel ? { model: selectedModel } : {}),
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errPayload = (await response.json().catch(() => ({}))) as {
                    error?: string;
                    message?: string;
                };
                const msg =
                    errPayload.error ||
                    errPayload.message ||
                    `Chat request failed with status ${response.status}`;
                setErrorBanner(msg);
                setMessages((prev) =>
                    prev.filter((m) => m.id !== assistantId || m.content.length > 0),
                );
                return;
            }

            if (!response.body) {
                setErrorBanner('Response stream was empty.');
                setMessages((prev) => prev.filter((m) => m.id !== assistantId));
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const applyEvent = (event: ChatStreamEvent) => {
                if (event.type === 'tool_end') {
                    if (MUTATING_TOOLS.has(event.name)) {
                        onCatalogMutated?.();
                    }
                } else if (event.type === 'token') {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId ? { ...m, content: m.content + event.content } : m,
                        ),
                    );
                } else if (event.type === 'done') {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, model: event.model, isStreaming: false }
                                : m,
                        ),
                    );
                } else if (event.type === 'error') {
                    setErrorBanner(event.message);
                    setMessages((prev) =>
                        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
                    );
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const rawLine of lines) {
                    const line = rawLine.trim();
                    if (!line.startsWith('data:')) continue;
                    const jsonStr = line.slice(5).trim();
                    if (!jsonStr || jsonStr === '[DONE]') continue;

                    try {
                        const event = JSON.parse(jsonStr) as ChatStreamEvent;
                        applyEvent(event);
                    } catch {
                        // Ignore malformed SSE chunks
                    }
                }
            }

            // Flush any remaining buffered line
            const trailing = buffer.trim();
            if (trailing.startsWith('data:')) {
                const jsonStr = trailing.slice(5).trim();
                if (jsonStr && jsonStr !== '[DONE]') {
                    try {
                        const event = JSON.parse(jsonStr) as ChatStreamEvent;
                        applyEvent(event);
                    } catch {
                        // Ignore
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                return;
            }
            setErrorBanner(err instanceof Error ? err.message : 'Failed to connect to AI analyst.');
        } finally {
            setIsStreaming(false);
            setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
            );
            abortControllerRef.current = null;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void sendMessage(input);
    };

    return (
        <aside
            aria-label="AI Catalog Analyst"
            className="flex h-full min-h-135 flex-col rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-none"
        >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            AI Catalog Analyst
                        </h2>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Tool-calling SQLite &amp; metrics assistant
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="chat-model-select" className="sr-only">
                        AI Model
                    </label>
                    <select
                        id="chat-model-select"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isStreaming}
                        className="max-w-45 truncate rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none transition focus:border-indigo-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                    >
                        {MODEL_OPTIONS.map((opt) => (
                            <option key={opt.value || 'auto'} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={messages.length === 0 && !errorBanner}
                        title="Clear conversation"
                        aria-label="Clear conversation"
                        className="rounded-lg border border-zinc-300 bg-zinc-50 p-1.5 text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-800 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {errorBanner && (
                <div
                    role="alert"
                    className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div className="flex-1">
                        <p className="font-medium text-amber-300">Assistant Notice</p>
                        <p className="mt-0.5 text-amber-200/90">{errorBanner}</p>
                    </div>
                </div>
            )}

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-indigo-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-indigo-400">
                            <Bot className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Ask anything about your indie catalog
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                            Query revenue, compare titles, inspect genre breakdowns, or update
                            catalog entries via live tools.
                        </p>

                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            {STARTER_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => void sendMessage(prompt)}
                                    className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:border-indigo-500/60 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-700/80 dark:bg-zinc-950/90 dark:text-zinc-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-2.5 ${
                                msg.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                                    <Bot className="h-3.5 w-3.5" />
                                </div>
                            )}

                            <div
                                className={`max-w-[88%] space-y-2 ${
                                    msg.role === 'user'
                                        ? 'rounded-xl bg-indigo-600 px-3.5 py-2 text-sm text-white'
                                        : 'flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200'
                                }`}
                            >
                                {msg.content ? (
                                    <MarkdownMessage
                                        content={msg.content}
                                        isUser={msg.role === 'user'}
                                    />
                                ) : (
                                    msg.isStreaming && (
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                                            <span>Thinking...</span>
                                        </div>
                                    )
                                )}

                                {msg.model && !msg.isStreaming && (
                                    <div className="pt-1 text-[10px] text-zinc-500">
                                        Model: {msg.model}
                                    </div>
                                )}
                            </div>

                            {msg.role === 'user' && (
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    <User className="h-3.5 w-3.5" />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Input form */}
            <form
                onSubmit={handleSubmit}
                className="border-t border-zinc-200 p-3 dark:border-zinc-800"
            >
                <div className="flex items-center gap-2">
                    <label htmlFor="chat-input" className="sr-only">
                        Ask a question about the indie games catalog
                    </label>
                    <input
                        id="chat-input"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about revenue, ratings, genres..."
                        disabled={isStreaming}
                        className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-950"
                    />
                    <button
                        type="submit"
                        disabled={isStreaming || !input.trim()}
                        aria-label="Send message"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isStreaming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </form>
        </aside>
    );
}
