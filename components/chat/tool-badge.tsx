'use client';

import { useId, useState, type ReactElement, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  OctagonX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToolName, type ToolPart } from '@/lib/chat/parts';

const MAX_VALUE_LEN = 30;

export interface ToolBadgeProps {
  part: ToolPart;
}

function formatValue(value: unknown): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (s.length > MAX_VALUE_LEN) return s.slice(0, MAX_VALUE_LEN - 1) + '…';
  return s;
}

function compactArgs(input: unknown): string {
  if (typeof input !== 'object' || input === null) return '';
  return Object.entries(input as Record<string, unknown>)
    .map(([k, v]) => `${k}=${formatValue(v)}`)
    .join(', ');
}

export function ToolBadge({ part }: ToolBadgeProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const toolName = getToolName(part);
  const args = compactArgs(part.input);

  const isStreaming = part.state === 'input-streaming';
  const isError = part.state === 'output-error';
  const isComplete = part.state === 'output-available';

  const summary = isStreaming
    ? `calling ${toolName}…`
    : isError
      ? `${toolName} • error`
      : `${toolName}${args ? ' • ' + args : ''}`;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          'inline-flex w-full items-start gap-2 rounded-md border px-2.5 py-1.5 text-left font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          isError
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : 'border-border/70 bg-muted/60 text-muted-foreground hover:bg-muted',
          isStreaming && 'animate-pulse',
        )}
      >
        {isStreaming && (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        )}
        {isComplete && (
          <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
        )}
        {isError && <OctagonX className="size-3.5 shrink-0" aria-hidden />}
        <span className="flex-1 break-all">{summary}</span>
        {expanded ? (
          <ChevronUp className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="size-3.5 shrink-0" aria-hidden />
        )}
      </button>
      {expanded && (
        <div
          id={panelId}
          className="mt-1.5 space-y-2 rounded-md border border-border/50 bg-muted/30 p-2"
        >
          {part.input !== undefined && (
            <ExpandedBlock label="Input">
              {JSON.stringify(part.input, null, 2)}
            </ExpandedBlock>
          )}
          {isComplete && part.output !== undefined && (
            <ExpandedBlock label="Output">
              {JSON.stringify(part.output, null, 2)}
            </ExpandedBlock>
          )}
          {isError && part.errorText && (
            <ExpandedBlock label="Error" tone="destructive">
              {part.errorText}
            </ExpandedBlock>
          )}
        </div>
      )}
    </div>
  );
}

interface ExpandedBlockProps {
  label: string;
  tone?: 'default' | 'destructive';
  children: ReactNode;
}

function ExpandedBlock({
  label,
  tone = 'default',
  children,
}: ExpandedBlockProps): ReactElement {
  return (
    <div>
      <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre
        className={cn(
          'overflow-x-auto whitespace-pre-wrap break-words rounded bg-background/60 p-2 font-mono text-xs',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {children}
      </pre>
    </div>
  );
}
