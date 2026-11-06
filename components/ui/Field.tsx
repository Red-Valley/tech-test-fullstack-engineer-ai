'use client';

import { useId, type ComponentProps } from 'react';

interface FieldProps extends Omit<ComponentProps<'input'>, 'id' | 'onChange' | 'value'> {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function Field({ label, error, onChange, ...inputProps }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none aria-invalid:border-red-700"
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
