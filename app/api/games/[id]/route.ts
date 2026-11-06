import { deleteGame, getGame, updateGame } from '@/lib/games';
import { jsonError, readJson, validationError, withErrorEnvelope } from '@/lib/http';
import { gameUpdateSchema, idParamSchema } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = RouteContext<'/api/games/[id]'>;

/** The digits check comes first because idParamSchema coerces, and would read "1e2" as 100. */
function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = idParamSchema.safeParse(raw);
  return id.success ? id.data : null;
}

const invalidId = () => jsonError(400, 'INVALID_ID', 'id must be a positive integer');
const notFound = (id: number) => jsonError(404, 'NOT_FOUND', `Game ${id} not found`);

export const GET = withErrorEnvelope(async (_req: Request, ctx: Context) => {
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();

  const game = getGame(id);
  return game ? Response.json(game) : notFound(id);
});

export const PUT = withErrorEnvelope(async (req: Request, ctx: Context) => {
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();

  const body = await readJson(req);
  if (body === null) return jsonError(400, 'INVALID_JSON', 'Body must be valid JSON');

  const update = gameUpdateSchema.safeParse(body);
  if (!update.success) return validationError(update.error);

  const game = updateGame(id, update.data);
  return game ? Response.json(game) : notFound(id);
});

export const DELETE = withErrorEnvelope(async (_req: Request, ctx: Context) => {
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();

  return deleteGame(id) ? new Response(null, { status: 204 }) : notFound(id);
});
