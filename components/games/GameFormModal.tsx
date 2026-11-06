'use client';

import { startTransition, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { createGame, updateGame } from '@/lib/api-client';
import type { Game, GameInput } from '@/lib/types';
import { EMPTY_FORM, isGameField, parseGameForm, toFormValues, type GameFormErrors } from './game-form';

interface GameFormModalProps {
  /** The game to edit. Without it, the form creates a new one. */
  game?: Game;
  onClose: () => void;
}

export function GameFormModal({ game, onClose }: GameFormModalProps) {
  const router = useRouter();
  const [values, setValues] = useState(() => (game ? toFormValues(game) : EMPTY_FORM));
  const [errors, setErrors] = useState<GameFormErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fieldProps = (name: keyof GameInput) => ({
    name,
    value: values[name],
    error: errors[name]?.[0],
    // readOnly, not disabled: disabling the focused input would drop keyboard focus.
    readOnly: pending,
    onChange: (value: string) => {
      setValues((current) => ({ ...current, [name]: value }));
      setErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setBanner(null);
    const parsed = parseGameForm(values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    setPending(true);
    const result = game ? await updateGame(game.id, parsed.data) : await createGame(parsed.data);
    setPending(false);

    if (result.ok) {
      startTransition(() => router.refresh());
      onClose();
      return;
    }

    const { code, message, issues = {} } = result.error;
    if (code === 'NOT_FOUND') {
      setBanner('This game no longer exists.');
      startTransition(() => router.refresh());
      return;
    }
    const knownIssues = Object.fromEntries(Object.entries(issues).filter(([key]) => isGameField(key)));
    setErrors(knownIssues);
    if (Object.keys(knownIssues).length === 0) setBanner(message);
  }

  return (
    <Modal title={game ? `Edit ${game.title}` : 'Add game'} busy={pending} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {banner && <ErrorBanner>{banner}</ErrorBanner>}
        <Field label="Title" {...fieldProps('title')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Developer" {...fieldProps('developer')} />
          <Field label="Genre" {...fieldProps('genre')} />
          <Field label="Monthly revenue (USD)" inputMode="decimal" {...fieldProps('monthly_revenue_usd')} />
          <Field label="Monthly downloads" inputMode="numeric" {...fieldProps('monthly_downloads')} />
          <Field label="Average rating (0 to 5)" inputMode="decimal" {...fieldProps('average_rating')} />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" pending={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
