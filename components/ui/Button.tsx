import type { ComponentProps } from 'react';
import { Spinner } from './Spinner';

const VARIANTS = {
  primary: 'bg-brand text-background hover:opacity-90',
  secondary: 'border border-border bg-surface text-foreground hover:bg-border/50',
  danger: 'bg-red-700 text-white hover:bg-red-800',
};

interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof VARIANTS;
  pending?: boolean;
}

export function Button({ variant = 'secondary', pending = false, disabled, className = '', children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
