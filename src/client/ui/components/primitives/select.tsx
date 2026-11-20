import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/client/lib/cn';
import { controlClass, describedBy, Field } from '@/client/ui/components/primitives/field';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly string[];
  /** Text for the empty first option; omit to require a value. */
  placeholder?: string;
  error?: string;
  hint?: string;
};

export function Select({
  label,
  options,
  placeholder,
  error,
  hint,
  id,
  className,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <Field id={selectId} label={label} error={error} hint={hint}>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(selectId, error, hint)}
        className={cn(controlClass(Boolean(error)), className)}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}
