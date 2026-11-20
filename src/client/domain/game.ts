// UI-side model (camelCase). Imports nothing on purpose (ARCHITECTURE.md §4.1).

export type Game = {
  id: number;
  title: string;
  developer: string;
  genre: string;
  monthlyRevenueUsd: number;
  monthlyDownloads: number;
  averageRating: number;
};

/** What the create/edit form holds: raw input strings, so an empty field stays empty. */
export type GameFormValues = {
  title: string;
  developer: string;
  genre: string;
  monthlyRevenueUsd: string;
  monthlyDownloads: string;
  averageRating: string;
};

export type GameFormErrors = Partial<Record<keyof GameFormValues, string>>;

export type GameStats = {
  totalGames: number;
  totalRevenue: number;
  totalDownloads: number;
  averageRating: number;
  ratedAbove4: number;
};

export type GameSortBy = 'revenue' | 'downloads' | 'rating' | 'title' | 'genre';

export type GameQuery = {
  genre?: string;
  minRating?: number;
  maxRating?: number;
  q?: string;
  sortBy?: GameSortBy;
  order?: 'asc' | 'desc';
};
