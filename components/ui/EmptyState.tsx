import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-low px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children}
    </div>
  );
}
