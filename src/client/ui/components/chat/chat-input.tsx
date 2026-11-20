import { Button } from '@/client/ui/components/primitives/button';

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  /** A request is in flight: show Stop instead of Send. */
  isBusy: boolean;
};

export function ChatInput({ value, onChange, onSubmit, onStop, isBusy }: ChatInputProps) {
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isBusy && value.trim()) onSubmit();
      }}
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask about the catalog
      </label>
      <textarea
        id="chat-input"
        rows={2}
        value={value}
        placeholder="Ask about the catalog…"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, Shift+Enter adds a line. While an IME is composing (Japanese, Chinese,
          // Korean…), Enter confirms the candidate and must not send.
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="min-h-10 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      />
      {isBusy ? (
        <Button variant="secondary" onClick={onStop}>
          Stop
        </Button>
      ) : (
        <Button type="submit" disabled={!value.trim()}>
          Send
        </Button>
      )}
    </form>
  );
}
