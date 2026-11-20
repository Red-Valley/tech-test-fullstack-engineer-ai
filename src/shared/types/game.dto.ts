import type { z } from 'zod';
import type { gameInputSchema, gameSchema, gameUpdateSchema } from '@/shared/schemas/game.schema';

export type GameDto = z.infer<typeof gameSchema>;
export type GameInputDto = z.infer<typeof gameInputSchema>;
export type GameUpdateDto = z.infer<typeof gameUpdateSchema>;

export type GameStatsDto = {
  totalGames: number;
  totalRevenue: number;
  totalDownloads: number;
  averageRating: number;
  ratedAbove4: number;
};

export type ApiErrorDto = {
  error: string;
  fieldErrors?: Record<string, string[]>;
};
