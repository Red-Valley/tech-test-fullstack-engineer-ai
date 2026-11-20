'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/client/domain/chat';
import { MessageBubble } from '@/client/ui/components/chat/message-bubble';
import { Spinner } from '@/client/ui/components/primitives/feedback';

type MessageListProps = {
  messages: ChatMessage[];
  /** True between sending and the first streamed part of the answer. */
  isWaiting: boolean;
  /** True while an answer is being streamed. */
  isStreaming: boolean;
};

const textOf = (message: ChatMessage | undefined) =>
  message?.parts.flatMap((part) => (part.kind === 'text' ? [part.text] : [])).join(' ') ?? '';

export function MessageList({ messages, isWaiting, isStreaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);
  // Changes on every streamed part, so the newest text stays in view.
  const scrollKey = `${messages.length}:${lastMessage?.parts.length}:${textOf(lastMessage).length}`;

  useEffect(() => {
    // Scroll only the chat's own box (scrollIntoView would also scroll the page on mobile).
    const box = endRef.current?.closest<HTMLElement>('[data-chat-scroll]');
    if (box) box.scrollTop = box.scrollHeight;
  }, [scrollKey, isWaiting]);

  // Screen readers hear the finished answer once, not every streamed token.
  const announcement = !isStreaming && lastMessage?.role === 'assistant' ? textOf(lastMessage) : '';

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ol>
      {isWaiting && <Spinner label="Thinking" />}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div ref={endRef} />
    </div>
  );
}
