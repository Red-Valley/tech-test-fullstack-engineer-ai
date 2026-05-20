'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { GameFormDialog } from '@/components/game-form-dialog';
import { GamesTable } from '@/components/games-table';
import type { Game, GameCreate, GameUpdate } from '@/lib/games/schema';

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; game: Game }
  | null;

interface ApiErrorBody {
  error?: string;
  details?: Array<{ path: string; message: string }>;
}

type SubmitResult =
  | { success: true }
  | { success: false; fieldErrors: Record<string, string> };

function detailsToFieldErrors(
  details: ApiErrorBody['details'],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!details) return out;
  for (const issue of details) {
    if (!out[issue.path]) out[issue.path] = issue.message;
  }
  return out;
}

export default function DashboardPage(): ReactElement {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);

  const fetchGames = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/games');
      if (!res.ok) throw new Error(`Failed to load catalog (HTTP ${res.status})`);
      const data = (await res.json()) as Game[];
      setGames(data);
    } catch (e) {
      setError((e as Error).message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial catalog fetch on mount. This is a legitimate "synchronize with an
    // external system" use of useEffect; the React 19 react-hooks rule flags
    // any setState inside an effect, but the documented alternative
    // (`use(promise)` with Suspense) is overkill for a single fetch and would
    // require a Suspense boundary further up the tree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchGames();
  }, [fetchGames]);

  async function handleCreate(
    input: GameCreate | GameUpdate,
  ): Promise<SubmitResult> {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.status === 201) {
      const created = (await res.json()) as Game;
      setGames((prev) => [created, ...prev]);
      setModalState(null);
      toast.success('Game created');
      return { success: true };
    }
    if (res.status === 400) {
      const body = (await res.json()) as ApiErrorBody;
      return { success: false, fieldErrors: detailsToFieldErrors(body.details) };
    }
    toast.error('Failed to save. Try again.');
    return { success: false, fieldErrors: {} };
  }

  async function handleEdit(
    id: string,
    input: GameUpdate,
  ): Promise<SubmitResult> {
    const res = await fetch(`/api/games/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.status === 200) {
      const updated = (await res.json()) as Game;
      setGames((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setModalState(null);
      toast.success('Game updated');
      return { success: true };
    }
    if (res.status === 400) {
      const body = (await res.json()) as ApiErrorBody;
      return { success: false, fieldErrors: detailsToFieldErrors(body.details) };
    }
    if (res.status === 404) {
      toast.error('Game no longer exists');
      return { success: false, fieldErrors: {} };
    }
    toast.error('Failed to save. Try again.');
    return { success: false, fieldErrors: {} };
  }

  async function handleDelete(game: Game): Promise<void> {
    if (!window.confirm(`Delete "${game.title}"?`)) return;
    const res = await fetch(`/api/games/${encodeURIComponent(game.id)}`, {
      method: 'DELETE',
    });
    if (res.status === 204) {
      setGames((prev) => prev.filter((g) => g.id !== game.id));
      toast.success('Game deleted');
      return;
    }
    if (res.status === 404) {
      toast.error('Game no longer exists');
      return;
    }
    toast.error('Failed to delete. Try again.');
  }

  const empty = !loading && !error && games.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${games.length} games tracked`}
          </p>
        </div>
        <Button onClick={() => setModalState({ mode: 'create' })}>
          New game
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchGames()}>
            Retry
          </Button>
        </div>
      )}

      {empty ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card py-16 text-center text-muted-foreground">
          <p>No games yet.</p>
          <Button onClick={() => setModalState({ mode: 'create' })}>
            Add your first one
          </Button>
        </div>
      ) : (
        !error && (
          <GamesTable
            games={games}
            loading={loading}
            onEdit={(g) => setModalState({ mode: 'edit', game: g })}
            onDelete={handleDelete}
          />
        )
      )}

      <GameFormDialog
        // Unique key per modal session forces a remount when switching between
        // create / edit / different game, so GameFormDialog's useState
        // initializers pick up the new initialGame cleanly.
        key={
          modalState === null
            ? 'closed'
            : modalState.mode === 'edit'
              ? `edit-${modalState.game.id}`
              : 'create'
        }
        open={modalState !== null}
        mode={modalState?.mode ?? 'create'}
        initialGame={modalState?.mode === 'edit' ? modalState.game : null}
        onSubmit={
          modalState?.mode === 'edit'
            ? (input) => handleEdit(modalState.game.id, input as GameUpdate)
            : handleCreate
        }
        onClose={() => setModalState(null)}
      />
    </div>
  );
}
