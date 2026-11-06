'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// In Next 16.4 the error boundary receives `retry`, not the older `reset`.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted">This page could not load. Try again in a moment.</p>
      <Button variant="primary" onClick={() => retry()}>
        Try again
      </Button>
    </main>
  );
}
