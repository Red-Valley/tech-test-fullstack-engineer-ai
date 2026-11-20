import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/client/lib/cn';

const VARIANTS = {
  primary: 'bg-accent text-accent-foreground hover:opacity-90',
  secondary: 'border border-border bg-surface text-foreground hover:bg-background',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'text-muted hover:bg-background hover:text-foreground',
} as const;

const SIZES = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-10 px-4 text-sm',
  icon: 'size-8',
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

/** Icon-only buttons (size="icon") must pass an aria-label. */
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition',
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
