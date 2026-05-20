'use client';

import type { ReactElement } from 'react';
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
            <p
              key={`text-${idx}`}
              className={cn(
                'whitespace-pre-wrap break-words leading-relaxed',
                streaming && 'text-foreground/70',
              )}
            >
              {part.text}
            </p>
          );
        }
        // step-start: SDK marker, not user-visible.
        return null;
      })}
    </div>
  );
}
