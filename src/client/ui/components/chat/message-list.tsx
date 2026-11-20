'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/client/domain/chat';
import { MessageBubble } from '@/client/ui/components/chat/message-bubble';
import { Spinner } from '@/client/ui/components/primitives/feedback';

type MessageListProps = {
  messages: ChatMessage[];
  /** True between sending and the first streamed part of the answer. */
  isWaiting: boolean;
};

export function MessageList({ messages, isWaiting }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);
  // Re-run on every streamed part so the newest text stays in view.
  const scrollKey = `${messages.length}:${lastMessage?.parts.length}:${JSON.stringify(lastMessage?.parts.at(-1))?.length}`;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [scrollKey, isWaiting]);

  return (
    // aria-live announces new answers to screen readers without moving focus.
    <div aria-live="polite" className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ol>
      {isWaiting && <Spinner label="Thinking" />}
      <div ref={endRef} />
    </div>
  );
}
