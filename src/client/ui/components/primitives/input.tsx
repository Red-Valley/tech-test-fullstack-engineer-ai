import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/client/lib/cn';
import { controlClass, describedBy, Field } from '@/client/ui/components/primitives/field';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field id={inputId} label={label} error={error} hint={hint}>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cn(controlClass(Boolean(error)), className)}
        {...props}
      />
    </Field>
  );
}
