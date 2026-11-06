'use client';

import { Chat as ChatSession, useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type ChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { ChatUIMessage } from '@/lib/ai/tools';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { SuggestedPrompts } from './SuggestedPrompts';

// Outside the component so the conversation survives going to the dashboard and back.
const sharedSession = new ChatSession<ChatUIMessage>({
  transport: new DefaultChatTransport<ChatUIMessage>({ api: '/api/chat' }),
});

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const NEAR_BOTTOM_PX = 80;

const errorEnvelopeSchema = z.object({ error: z.object({ message: z.string() }) });

/** The transport puts the response body in error.message: only the API's envelope is safe to show. */
function getErrorMessage(error: Error): string {
  try {
    return errorEnvelopeSchema.parse(JSON.parse(error.message)).error.message;
  } catch {
    return GENERIC_ERROR;
  }
}

interface ChatProps {
  suggestedPrompts: string[];
  transport?: ChatTransport<ChatUIMessage>;
}

export function Chat({ suggestedPrompts, transport }: ChatProps) {
  const [session] = useState(() => (transport ? new ChatSession<ChatUIMessage>({ transport }) : sharedSession));
  const { messages, sendMessage, setMessages, clearError, status, stop, error, regenerate } = useChat<ChatUIMessage>({ chat: session });
  const isBusy = status === 'submitted' || status === 'streaming';

  const scrollerRef = useRef<HTMLDivElement>(null);
  const isFollowingRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Follows the stream unless the user has scrolled up to read something.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && isFollowingRef.current) scroller.scrollTop = scroller.scrollHeight;
  }, [messages, status, error]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    isFollowingRef.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR_BOTTOM_PX;
  }

  function send(text: string) {
    isFollowingRef.current = true;
    void sendMessage({ text });
    inputRef.current?.focus();
  }

  function startNewChat() {
    clearError();
    setMessages([]);
    inputRef.current?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={scrollerRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <SuggestedPrompts prompts={suggestedPrompts} onSelect={send} />
        ) : (
          <MessageList messages={messages} isBusy={isBusy} />
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-700 px-4 py-2 text-sm text-red-700 dark:border-red-400 dark:text-red-400"
        >
          <span className="min-w-0 break-words">{getErrorMessage(error)}</span>
          <button
            type="button"
            onClick={() => void regenerate()}
            className="shrink-0 rounded-lg border border-current px-3 py-1 font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            Retry
          </button>
        </div>
      )}

      {messages.length > 0 && !isBusy && (
        <button
          type="button"
          onClick={startNewChat}
          className="self-end rounded-lg px-2 py-1 text-sm text-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          New chat
        </button>
      )}

      <ChatInput isBusy={isBusy} inputRef={inputRef} onSend={send} onStop={() => void stop()} />
    </div>
  );
}
