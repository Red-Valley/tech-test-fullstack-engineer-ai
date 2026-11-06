import { getToolName, isToolUIPart } from 'ai';
import type { ChatUIMessage } from '@/lib/ai/tools';
import { Markdown } from './Markdown';
import { ToolCallChip } from './ToolCallChip';

type MessagePart = ChatUIMessage['parts'][number];

function isVisiblePart(part: MessagePart): boolean {
  return (part.type === 'text' && part.text.length > 0) || isToolUIPart(part);
}

function MessageBubble({ message, isActive }: { message: ChatUIMessage; isActive: boolean }) {
  const parts = message.parts.filter(isVisiblePart);
  if (parts.length === 0) return null;

  if (message.role === 'user') {
    return (
      <li className="ml-auto max-w-[85%] rounded-2xl bg-brand px-4 py-2 break-words whitespace-pre-wrap text-on-brand">
        {parts.map((part, index) => (part.type === 'text' ? <span key={index}>{part.text}</span> : null))}
      </li>
    );
  }

  return (
    <li className="flex max-w-full flex-col gap-2 rounded-2xl bg-surface px-4 py-3 shadow-md break-words">
      {parts.map((part, index) => {
        if (part.type === 'text') return <Markdown key={index} text={part.text} />;
        if (!isToolUIPart(part)) return null;
        return (
          <ToolCallChip
            key={part.toolCallId}
            name={getToolName(part)}
            state={part.state}
            input={part.input}
            isActive={isActive}
          />
        );
      })}
    </li>
  );
}

interface MessageListProps {
  messages: ChatUIMessage[];
  /** Whether a response is being requested or streamed. */
  isBusy: boolean;
}

export function MessageList({ messages, isBusy }: MessageListProps) {
  const lastMessage = messages.at(-1);
  const isWritingText = lastMessage?.role === 'assistant' && lastMessage.parts.at(-1)?.type === 'text';

  return (
    <div role="log" aria-live="polite" aria-label="Conversation">
      <ul className="flex flex-col gap-3">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} isActive={isBusy && message === lastMessage} />
        ))}
      </ul>
      {isBusy && !isWritingText && (
        <p className="mt-3 text-sm text-muted motion-safe:animate-pulse">Thinking…</p>
      )}
    </div>
  );
}
