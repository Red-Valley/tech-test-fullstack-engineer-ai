import type { ReactNode } from 'react';

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-red-700/40 bg-red-700/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
      {children}
    </p>
  );
}
