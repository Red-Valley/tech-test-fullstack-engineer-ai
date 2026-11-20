'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { useCatalog } from '@/client/context/catalog-context';
import {
  extractGameIds,
  toChatErrorMessage,
  toChatMessages,
} from '@/client/transformers/chat.transformer';
import { ChatInput } from '@/client/ui/components/chat/chat-input';
import { ChatPanel } from '@/client/ui/components/chat/chat-panel';
import { MessageList } from '@/client/ui/components/chat/message-list';
import { SuggestionChips } from '@/client/ui/components/chat/suggestion-chips';

// The assignment's three example questions. "Game A vs Game B" uses the two top-revenue
// titles from the seed data so the chip works out of the box.
const SUGGESTIONS = [
  'Which game made the most revenue last month?',
  'How many games are rated above 4?',
  'Compare revenue of Starfall Courier vs Deepdelve.',
] as const;

export function ChatContainer() {
  const { setHighlightedGameIds } = useCatalog();
  // useChat posts to /api/chat by default and owns the streaming (the one allowed fetch, §4.3).
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({
    // Highlight the games this answer is about; an answer without games clears the highlight.
    onFinish: ({ message, isError }) => {
      if (!isError) setHighlightedGameIds(extractGameIds(message));
    },
  });
  const [input, setInput] = useState('');

  const isBusy = status === 'submitted' || status === 'streaming';
  const chatMessages = toChatMessages(messages, isBusy ? messages.at(-1)?.id : undefined);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    clearError();
    void sendMessage({ text: trimmed });
    setInput('');
  };

  return (
    <ChatPanel
      canClear={messages.length > 0 && !isBusy}
      onClear={() => {
        setMessages([]);
        clearError();
        setHighlightedGameIds([]);
      }}
      error={toChatErrorMessage(error)}
      input={
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          onStop={() => void stop()}
          isBusy={isBusy}
        />
      }
    >
      {chatMessages.length === 0 ? (
        <SuggestionChips suggestions={SUGGESTIONS} onPick={send} disabled={isBusy} />
      ) : (
        <MessageList
          messages={chatMessages}
          isWaiting={status === 'submitted'}
          isStreaming={isBusy}
        />
      )}
    </ChatPanel>
  );
}
