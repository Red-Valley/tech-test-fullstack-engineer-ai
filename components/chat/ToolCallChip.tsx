import type { DynamicToolUIPart } from 'ai';

type ChipStatus = 'running' | 'done' | 'failed' | 'stopped';

function getChipStatus(state: DynamicToolUIPart['state'], isActive: boolean): ChipStatus {
  switch (state) {
    case 'output-available':
      return 'done';
    case 'output-error':
    case 'output-denied':
      return 'failed';
    default:
      // After Stop, a call never gets its result, so it must not spin forever.
      return isActive ? 'running' : 'stopped';
  }
}

const STATUS_VIEW: Record<ChipStatus, { label: (name: string) => string; icon: string; className: string }> = {
  running: { label: (name) => `Querying ${name}…`, icon: '', className: 'text-muted' },
  done: { label: (name) => name, icon: '✓', className: 'text-green-700 dark:text-green-400' },
  failed: { label: (name) => `${name} failed`, icon: '✕', className: 'text-red-700 dark:text-red-400' },
  stopped: { label: (name) => `${name} stopped`, icon: '■', className: 'text-muted' },
};

interface ToolCallChipProps {
  name: string;
  state: DynamicToolUIPart['state'];
  input: unknown;
  /** Whether the response that made this call is still in progress. */
  isActive: boolean;
}

export function ToolCallChip({ name, state, input, isActive }: ToolCallChipProps) {
  const status = getChipStatus(state, isActive);
  const { label, icon, className } = STATUS_VIEW[status];
  const hasArguments = typeof input === 'object' && input !== null && Object.keys(input).length > 0;

  const summary = (
    <span className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      {status === 'running' ? (
        <span
          aria-hidden="true"
          className="size-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
        />
      ) : (
        <span aria-hidden="true">{icon}</span>
      )}
      {label(name)}
    </span>
  );

  return (
    <div className="w-fit max-w-full rounded-lg border border-border bg-background px-2.5 py-1 text-xs">
      {hasArguments ? (
        <details>
          <summary className="cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
            {summary}
          </summary>
          <pre className="mt-1.5 overflow-x-auto font-mono text-muted">{JSON.stringify(input, null, 2)}</pre>
        </details>
      ) : (
        summary
      )}
    </div>
  );
}
