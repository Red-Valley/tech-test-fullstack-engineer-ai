import type { ComponentProps } from 'react';
import { Spinner } from './Spinner';

const VARIANTS = {
  primary: 'bg-brand text-on-brand hover:opacity-90',
  secondary: 'bg-surface-highest text-foreground hover:bg-surface-high',
  danger: 'bg-error-container text-on-error-container hover:opacity-90',
};

interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof VARIANTS;
  pending?: boolean;
}

export function Button({ variant = 'secondary', pending = false, disabled, className = '', children, type = 'button', onClick, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      // aria-disabled, not disabled, while pending: disabling the clicked button would
      // drop focus out of its dialog, and the dialog would stop seeing Esc.
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={pending ? (event) => event.preventDefault() : onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
