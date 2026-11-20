import { request } from '@/client/api/http-client';
import type { GameDto, GameInputDto, GameStatsDto } from '@/shared/types/game.dto';

// Returns DTOs only; hooks turn them into domain objects (ARCHITECTURE.md §4.1).

export type GamesQueryDto = {
  genre?: string;
  minRating?: number;
  maxRating?: number;
  q?: string;
  sortBy?: string;
  order?: string;
};

const BASE = '/api/games';

const toSearch = (query: GamesQueryDto) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : '';
};

export const getGames = (query: GamesQueryDto = {}) =>
  request<GameDto[]>(`${BASE}${toSearch(query)}`);

export const getGame = (id: number) => request<GameDto>(`${BASE}/${id}`);

export const createGame = (input: GameInputDto) =>
  request<GameDto>(BASE, { method: 'POST', body: JSON.stringify(input) });

export const updateGame = (id: number, input: GameInputDto) =>
  request<GameDto>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(input) });

export const deleteGame = (id: number) => request<void>(`${BASE}/${id}`, { method: 'DELETE' });

export const getStats = () => request<GameStatsDto>(`${BASE}/stats`);
