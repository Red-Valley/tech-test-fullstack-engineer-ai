import type { ReactNode } from 'react';
import { cn } from '@/client/lib/cn';

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
};

/** Used for both "nothing here" and "couldn't load": every data view has one (§4.6). */
export function EmptyState({ title, description, action, tone = 'neutral' }: EmptyStateProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center"
    >
      <p className={cn('font-medium', tone === 'error' && 'text-danger')}>{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
