'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownMessage({ content, isUser }: { content: string; isUser: boolean }) {
    return (
        <div className="space-y-2 wrap-break-word text-[13px] leading-relaxed">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="last:mb-0">{children}</p>,
                    h1: ({ children }) => (
                        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                            {children}
                        </h3>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc space-y-1 pl-4 marker:text-zinc-400">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal space-y-1 pl-4 marker:text-zinc-400">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => (
                        <strong
                            className={`font-semibold ${isUser ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}
                        >
                            {children}
                        </strong>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-indigo-400/60 pl-3 text-zinc-600 italic dark:text-zinc-300">
                            {children}
                        </blockquote>
                    ),
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className={`underline underline-offset-2 ${
                                isUser
                                    ? 'text-indigo-100 hover:text-white'
                                    : 'text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
                            }`}
                        >
                            {children}
                        </a>
                    ),
                    code: ({ className, children }) => {
                        const isBlock = Boolean(className);
                        if (isBlock) {
                            return (
                                <code className="block overflow-x-auto rounded-lg bg-zinc-100 p-2.5 font-mono text-xs text-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200">
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <code
                                className={`rounded px-1 py-0.5 font-mono text-[12px] ${
                                    isUser
                                        ? 'bg-indigo-700/70 text-white'
                                        : 'bg-zinc-200/80 text-indigo-700 dark:bg-zinc-800/90 dark:text-indigo-200'
                                }`}
                            >
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
                    table: ({ children }) => (
                        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <table className="w-full border-collapse text-left text-xs">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-zinc-100 text-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
                            {children}
                        </thead>
                    ),
                    th: ({ children }) => (
                        <th className="border-b border-zinc-200 px-2.5 py-1.5 font-medium dark:border-zinc-800">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border-b border-zinc-200/80 px-2.5 py-1.5 text-zinc-700 dark:border-zinc-800/60 dark:text-zinc-300">
                            {children}
                        </td>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
