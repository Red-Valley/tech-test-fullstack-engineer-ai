import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/server/http/request';
import { GAME_SORT_FIELDS, SORT_ORDERS } from '@/server/repositories/games.repository';
import { created, errorResponse, ok, validationError } from '@/server/http/responses';
import { getGamesService } from '@/server/services/games.service';
import { GENRES } from '@/shared/constants/genres';
import { gameInputSchema } from '@/shared/schemas/game.schema';

export const runtime = 'nodejs';

// Query params arrive as strings. sortBy/order are enums so nothing unexpected can reach the
// repository's ORDER BY map.
const listQuerySchema = z
  .object({
    genre: z.enum(GENRES).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRating: z.coerce.number().min(0).max(5).optional(),
    sortBy: z.enum(GAME_SORT_FIELDS).optional(),
    order: z.enum(SORT_ORDERS).optional(),
    q: z.string().trim().min(1).max(100).optional(),
  })
  .refine(
    ({ minRating, maxRating }) =>
      minRating === undefined || maxRating === undefined || minRating <= maxRating,
    { message: 'minRating must be less than or equal to maxRating', path: ['minRating'] },
  );

export function GET(request: NextRequest) {
  // Empty params (?genre=) mean "no filter", not an invalid value.
  const params = Object.fromEntries(
    [...request.nextUrl.searchParams].filter(([, value]) => value.trim() !== ''),
  );
  const query = listQuerySchema.safeParse(params);
  if (!query.success) return validationError(query.error);
  try {
    return ok(getGamesService().listGames(query.data));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const body = await parseJsonBody(request, gameInputSchema);
  if (!body.ok) return body.response;
  try {
    return created(getGamesService().createGame(body.data));
  } catch (error) {
    return errorResponse(error);
  }
}
