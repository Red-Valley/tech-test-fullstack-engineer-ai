'use client';

import { useState } from 'react';
import { z } from 'zod';
import * as gamesApi from '@/client/api/games.api';
import { ApiError } from '@/client/api/http-client';
import type { Game, GameFormErrors, GameFormValues } from '@/client/domain/game';
import { formValuesToInput, toFormErrors, toGame } from '@/client/transformers/game.transformer';
import { gameInputSchema } from '@/shared/schemas/game.schema';
import type { GameInputDto } from '@/shared/types/game.dto';

export type MutationResult<T> =
  { ok: true; data: T } | { ok: false; message: string; fieldErrors: GameFormErrors };

/**
 * Same schema as the API, so the form shows errors before any request is sent. Exported for
 * tests; its DTO output only feeds the API call inside `save` and never reaches the UI.
 */
export function validateGameForm(
  values: GameFormValues,
): { ok: true; input: GameInputDto } | { ok: false; fieldErrors: GameFormErrors } {
  const result = gameInputSchema.safeParse(formValuesToInput(values));
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, fieldErrors: toFormErrors(z.flattenError(result.error).fieldErrors) };
}

/** Turns an API failure into something the form can show; a 409 belongs on the title field. */
export function toMutationFailure(error: unknown): {
  ok: false;
  message: string;
  fieldErrors: GameFormErrors;
} {
  if (!(error instanceof ApiError)) {
    return { ok: false, message: 'Something went wrong. Please try again.', fieldErrors: {} };
  }
  if (error.status === 409)
    return { ok: false, message: error.message, fieldErrors: { title: error.message } };
  return { ok: false, message: error.message, fieldErrors: toFormErrors(error.fieldErrors ?? {}) };
}

export function useGameMutations() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function run<T>(action: () => Promise<T>): Promise<MutationResult<T>> {
    setIsSubmitting(true);
    try {
      return { ok: true, data: await action() };
    } catch (error) {
      return toMutationFailure(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function save(values: GameFormValues, id?: number): Promise<MutationResult<Game>> {
    const validated = validateGameForm(values);
    if (!validated.ok) {
      return {
        ok: false,
        message: 'Please fix the highlighted fields.',
        fieldErrors: validated.fieldErrors,
      };
    }
    return run(async () =>
      toGame(
        id === undefined
          ? await gamesApi.createGame(validated.input)
          : await gamesApi.updateGame(id, validated.input),
      ),
    );
  }

  return {
    isSubmitting,
    createGame: (values: GameFormValues) => save(values),
    updateGame: (id: number, values: GameFormValues) => save(values, id),
    deleteGame: (id: number) => run(() => gamesApi.deleteGame(id)),
  };
}
