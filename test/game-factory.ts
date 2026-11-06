import type { Game, GameInput } from '@/lib/types';

export function makeGameInput(overrides: Partial<GameInput> = {}): GameInput {
  return {
    title: 'Test Game',
    developer: 'Test Studio',
    genre: 'Puzzle',
    monthly_revenue_usd: 1000,
    monthly_downloads: 500,
    average_rating: 3.5,
    ...overrides,
  };
}

export function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    ...makeGameInput(),
    created_at: '2026-11-05T21:00:00.000Z',
    updated_at: '2026-11-05T21:00:00.000Z',
    ...overrides,
  };
}
