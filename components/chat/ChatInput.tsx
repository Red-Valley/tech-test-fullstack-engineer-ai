'use client';

import { useState, type FormEvent, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';

interface ChatInputProps {
  isBusy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}

const BUTTON_CLASS =
  'rounded-xl px-4 py-2 font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none';

export function ChatInput({ isBusy, onSend, onStop, inputRef }: ChatInputProps) {
  const [text, setText] = useState('');
  const canSend = !isBusy && text.trim().length > 0;

  function send() {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: Enter confirms the candidate of an IME, it does not mean "send".
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  function handleStop(event: MouseEvent) {
    // The button is about to unmount, which would drop the focus on the page body.
    inputRef?.current?.focus();
    // Stop appears where Send was, so the second click of a double click lands on it.
    if (event.detail < 2) onStop();
  }

  function handleSendClick(event: MouseEvent) {
    // Send appears where Stop was, so the second click would send the draft.
    if (event.detail >= 2) event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label htmlFor="chat-input" className="sr-only">
        Your question
      </label>
      <textarea
        ref={inputRef}
        id="chat-input"
        rows={2}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about the catalog. Enter sends, Shift+Enter adds a line."
        className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      />
      {/* Without keys React reuses the node, which becomes a submit button during the click on Stop and sends the draft. */}
      {isBusy ? (
        <button key="stop" type="button" onClick={handleStop} className={`${BUTTON_CLASS} border border-border bg-surface`}>
          Stop
        </button>
      ) : (
        <button key="send" type="submit" disabled={!canSend} onClick={handleSendClick} className={`${BUTTON_CLASS} bg-brand text-white dark:text-slate-900 disabled:opacity-50`}>
          Send
        </button>
      )}
    </form>
  );
}
