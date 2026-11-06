import 'server-only';
import type { Game, GameInput } from './types';

export type SortField = 'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating' | 'title';

export interface GameFilters {
  genre?: string;
  developer?: string;
  minRating?: number;
  maxRating?: number;
  minRevenue?: number;
  search?: string; // LIKE sobre title
  sortBy?: SortField;
  order?: 'asc' | 'desc';
  limit?: number;
}

export interface GameStats {
  count: number;
  total_revenue_usd: number;
  avg_revenue_usd: number;
  total_downloads: number;
  avg_rating: number;
}

// Contract stub so track B compiles before track A lands. Task 02 replaces this file.
const notImplemented = (): never => {
  throw new Error('lib/games.ts is not implemented yet (task 02)');
};

export const listGames: (filters?: GameFilters) => Game[] = notImplemented;
export const getGame: (id: number) => Game | null = notImplemented;
export const createGame: (input: GameInput) => Game = notImplemented;
export const updateGame: (id: number, input: Partial<GameInput>) => Game | null = notImplemented;
export const deleteGame: (id: number) => boolean = notImplemented;
export const getStats: (filters?: Omit<GameFilters, 'sortBy' | 'order' | 'limit'>) => GameStats = notImplemented;
export const findGamesByTitles: (titles: string[]) => Game[] = notImplemented;
export const listGenres: () => string[] = notImplemented;
