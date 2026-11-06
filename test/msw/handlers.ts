import { http, HttpResponse } from 'msw';
import type { Game, GameInput } from '@/lib/types';

export const sampleGame: Game = {
  id: 1,
  title: 'Starfall Tactics',
  developer: 'Nimbus Forge',
  genre: 'Strategy',
  monthly_revenue_usd: 182500.5,
  monthly_downloads: 48210,
  average_rating: 4.6,
  created_at: '2026-11-05T21:00:00.000Z',
  updated_at: '2026-11-05T21:00:00.000Z',
};

export const handlers = [
  http.get('*/api/games', () => HttpResponse.json([sampleGame])),
  http.post('*/api/games', async ({ request }) => {
    const input = (await request.json()) as GameInput;
    return HttpResponse.json({ ...sampleGame, ...input, id: 2 }, { status: 201 });
  }),
  http.put('*/api/games/:id', async ({ request, params }) => {
    const input = (await request.json()) as Partial<GameInput>;
    return HttpResponse.json({ ...sampleGame, ...input, id: Number(params.id) });
  }),
  http.delete('*/api/games/:id', () => new HttpResponse(null, { status: 204 })),
];
