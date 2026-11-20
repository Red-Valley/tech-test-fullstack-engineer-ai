import type { ReactNode } from 'react';
import { cn } from '@/client/lib/cn';

export const controlClass = (hasError: boolean) =>
  cn(
    'border-border bg-surface h-10 w-full rounded-md border px-3 text-sm',
    'focus-visible:ring-accent focus-visible:ring-2 focus-visible:outline-none',
    hasError && 'border-danger',
  );

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Label + control + error/hint text, wired together with ids for screen readers. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;
