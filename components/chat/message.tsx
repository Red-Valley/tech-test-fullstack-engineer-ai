'use client';

import type { ReactElement, ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { isToolPart, type MessagePart } from '@/lib/chat/parts';
import { ToolBadge } from './tool-badge';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
}

export interface MessageProps {
  message: ChatMessage;
}

function Passthrough({ children }: { children?: ReactNode }): ReactElement {
  return <span>{children}</span>;
}

// Constrained markdown renderer for assistant text parts. Allows minimal
// formatting (paragraphs, emphasis, lists, inline code), strips everything
// else to plain text or null so the model cannot smuggle headings, links,
// images, or block-level escapes into the conversation surface.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="ml-4 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="ml-4 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  a: Passthrough,
  img: () => null,
  blockquote: Passthrough,
  h1: Passthrough,
  h2: Passthrough,
  h3: Passthrough,
  h4: Passthrough,
  h5: Passthrough,
  h6: Passthrough,
  hr: () => null,
  table: Passthrough,
  pre: Passthrough,
};

export function Message({ message }: MessageProps): ReactElement {
  if (message.role === 'user') {
    // User messages collapse to a single text bubble — the chat UI only
    // sends one text part per submission, so concatenating is safe.
    const text = message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  // Assistant messages: render each part as a block in document order.
  // Tool badges sit between text blocks rather than inline-with-text — the
  // captured shape (step-start → tool → tool → step-start → text) maps
  // naturally to a top-to-bottom transcript: "the model called these
  // tools, then produced this answer". Inline-with-text would interrupt
  // sentence flow because v6 emits tool calls BEFORE the assistant text,
  // not embedded within it.
  return (
    <div className="flex flex-col gap-2 text-sm">
      {message.parts.map((part, idx) => {
        if (isToolPart(part)) {
          return <ToolBadge key={part.toolCallId} part={part} />;
        }
        if (part.type === 'text') {
          const streaming = part.state === 'streaming';
          return (
            <div
              key={`text-${idx}`}
              className={cn(
                'break-words leading-relaxed [&>*+*]:mt-2',
                streaming && 'text-foreground/70',
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MARKDOWN_COMPONENTS}
              >
                {part.text}
              </ReactMarkdown>
            </div>
          );
        }
        // step-start: SDK marker, not user-visible.
        return null;
      })}
    </div>
  );
}
