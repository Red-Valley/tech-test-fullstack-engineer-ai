import type { ReactNode } from 'react';

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-error/40 bg-error-container/30 px-3 py-2 text-sm text-on-error-container">
      {children}
    </p>
  );
}
