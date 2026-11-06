'use client';

import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Modal } from '@/components/ui/Modal';
import { deleteGame } from '@/lib/api-client';
import type { Game } from '@/lib/types';

export function DeleteButton({ game }: { game: Pick<Game, 'id' | 'title'> }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setConfirming(false);
    setError(null);
  }

  async function handleDelete() {
    setError(null);
    setPending(true);
    const result = await deleteGame(game.id);
    setPending(false);

    // A 404 means someone else already deleted it, which is what the user asked for.
    if (result.ok || result.error.code === 'NOT_FOUND') {
      close();
      startTransition(() => router.refresh());
      return;
    }
    setError(result.error.message);
  }

  return (
    <>
      <Button aria-label={`Delete ${game.title}`} onClick={() => setConfirming(true)}>
        Delete
      </Button>
      {confirming && (
        <Modal title={`Delete ${game.title}?`} busy={pending} onClose={close}>
          <div className="flex flex-col gap-4">
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <p className="text-sm text-muted">This removes the game from the catalog and cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" pending={pending} onClick={handleDelete}>
                {pending ? 'Deleting…' : 'Delete game'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
