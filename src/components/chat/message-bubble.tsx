import type { UiMessage } from "@/lib/chat/conversation";
import { Markdown } from "./markdown";
import { ToolCallChip } from "./tool-call-chip";

interface MessageBubbleProps {
  message: UiMessage;
  /** Only the newest reply can be "still thinking" or offer a retry. */
  isLast: boolean;
  streaming: boolean;
  onRetry: () => void;
}

function TypingDots() {
  return (
    <div role="status" aria-label="The assistant is thinking" className="flex items-center gap-1 py-2">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export function MessageBubble({ message, isLast, streaming, onRetry }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p
          data-role="user"
          className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2 text-sm text-white"
        >
          {message.text}
        </p>
      </div>
    );
  }

  const waiting = streaming && isLast && message.parts.length === 0 && !message.error;

  return (
    <div className="flex justify-start">
      <div data-role="assistant" className="min-w-0 max-w-[92%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5">
        {message.parts.map((part, index) =>
          part.kind === "tool" ? (
            <ToolCallChip key={part.call.id} call={part.call} />
          ) : (
            <Markdown key={index}>{part.text}</Markdown>
          ),
        )}
        {waiting && <TypingDots />}
        {message.error && (
          <div role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <p>{message.error}</p>
            {isLast && !streaming && (
              <button type="button" onClick={onRetry} className="mt-1 font-medium underline hover:no-underline">
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
