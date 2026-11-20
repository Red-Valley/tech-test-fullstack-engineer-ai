'use client';

import { useState } from 'react';
import { useCatalog } from '@/client/context/catalog-context';
import type { Game, GameFormErrors, GameFormValues } from '@/client/domain/game';
import { useGameMutations } from '@/client/hooks/use-game-mutations';
import { emptyFormValues, toFormValues } from '@/client/transformers/game.transformer';
import { GameFormModal } from '@/client/ui/components/games/game-form-modal';
import { GENRES } from '@/shared/constants/genres';

type GameFormContainerProps = {
  /** The game being edited; undefined means "create". */
  game?: Game;
  onClose: () => void;
};

/**
 * Mount it only while the modal is open, with a `key` per game, so each opening starts
 * from fresh values instead of syncing props into state.
 */
export function GameFormContainer({ game, onClose }: GameFormContainerProps) {
  const { refreshCatalog } = useCatalog();
  const { createGame, updateGame, isSubmitting } = useGameMutations();
  const [values, setValues] = useState<GameFormValues>(() =>
    game ? toFormValues(game) : emptyFormValues(),
  );
  const [errors, setErrors] = useState<GameFormErrors>({});
  const [formError, setFormError] = useState<string>();

  const handleChange = (field: keyof GameFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear a field's error as soon as the user edits it.
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async () => {
    setFormError(undefined);
    const result = game ? await updateGame(game.id, values) : await createGame(values);
    if (result.ok) {
      refreshCatalog();
      onClose();
      return;
    }
    setErrors(result.fieldErrors);
    // Field problems are shown next to the fields; only show a banner for anything else.
    if (Object.keys(result.fieldErrors).length === 0) setFormError(result.message);
  };

  return (
    <GameFormModal
      open
      mode={game ? 'edit' : 'create'}
      values={values}
      errors={errors}
      formError={formError}
      isSubmitting={isSubmitting}
      genres={GENRES}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
