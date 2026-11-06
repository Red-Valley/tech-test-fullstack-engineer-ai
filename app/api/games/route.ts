import { createGame, listGames } from '@/lib/games';
import { jsonError, readJson, validationError, withErrorEnvelope } from '@/lib/http';
import { gameInputSchema, gameQuerySchema } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorEnvelope((req: Request) => {
  const query = gameQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!query.success) return validationError(query.error);
  return Response.json(listGames(query.data));
});

export const POST = withErrorEnvelope(async (req: Request) => {
  const body = await readJson(req);
  if (body === null) return jsonError(400, 'INVALID_JSON', 'Body must be valid JSON');

  const input = gameInputSchema.safeParse(body);
  if (!input.success) return validationError(input.error);

  const game = createGame(input.data);
  return Response.json(game, { status: 201, headers: { Location: `/api/games/${game.id}` } });
});
