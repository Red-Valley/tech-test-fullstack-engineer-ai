import type { ChatMessage } from '@/client/domain/chat';
import { cn } from '@/client/lib/cn';
import { ToolCallChip } from '@/client/ui/components/chat/tool-call-chip';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <li className={cn('flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
      <span className="sr-only">{isUser ? 'You said:' : 'Assistant:'}</span>
      {message.parts.map((part, index) =>
        part.kind === 'text' ? (
          <p
            key={index}
            className={cn(
              'max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
              isUser ? 'bg-accent text-accent-foreground' : 'border border-border bg-surface',
            )}
          >
            {part.text}
          </p>
        ) : (
          <div key={part.id} className="w-full max-w-[90%]">
            <ToolCallChip
              name={part.name}
              args={part.args}
              state={part.state}
              errorText={part.errorText}
            />
          </div>
        ),
      )}
    </li>
  );
}
