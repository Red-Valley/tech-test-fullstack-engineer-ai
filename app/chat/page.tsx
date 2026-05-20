'use client';

import { useChat } from '@ai-sdk/react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Message, type ChatMessage } from '@/components/chat/message';
import type { MessagePart } from '@/lib/chat/parts';

const SUGGESTIONS: ReadonlyArray<string> = [
  'Which game made the most revenue?',
  'How many games are rated above 4?',
  'Compare Hollow Knight and Celeste.',
];

function classifyError(message: string): string {
  if (message.includes('PROVIDER_NOT_CONFIGURED')) {
    return 'Chat is unavailable. Verify your API key in .env.local.';
  }
  if (message.includes('PROVIDER_UPSTREAM')) {
    return 'The AI provider is currently unreachable. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export default function ChatPage(): ReactElement {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState('');
  // Track which error we dismissed (by message), so a fresh error
  // automatically un-dismisses. This is the React 19 idiom for derived
  // state, avoiding a useEffect with setState.
  const [dismissedErrorMessage, setDismissedErrorMessage] = useState<
    string | undefined
  >();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or as the assistant streams in. This is a
  // pure DOM side effect (no setState), so the react-hooks/set-state-in-
  // effect rule does not apply.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, status]);

  const submitting = status === 'submitted' || status === 'streaming';
  const canSubmit = input.trim().length > 0 && !submitting;

  function handleSend(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    void sendMessage({ text: trimmed });
    setInput('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  const activeErrorMessage = error?.message;
  const showError =
    activeErrorMessage !== undefined &&
    activeErrorMessage !== dismissedErrorMessage;
  const errorText = showError ? classifyError(activeErrorMessage) : '';
  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <header className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about the catalog.
        </p>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              Ask me anything about the 15 indie games in the catalog.
            </p>
            <div className="flex w-full max-w-md flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left"
                  onClick={() => handleSend(s)}
                  disabled={submitting}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => (
                <Message
                  key={m.id}
                  message={
                    {
                      id: m.id,
                      role: m.role as 'user' | 'assistant',
                      parts: m.parts as unknown as MessagePart[],
                    } satisfies ChatMessage
                  }
                />
              ))}
          </div>
        )}
      </div>

      {showError && (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{errorText}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDismissedErrorMessage(activeErrorMessage)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <form
        className="mt-3 flex shrink-0 items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question…"
          autoFocus
          rows={1}
          className="max-h-40 min-h-10 resize-none"
        />
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Send aria-hidden />
          )}
          {submitting ? 'Sending' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
