import { handle, HttpError, parseBody, parseId } from "@/lib/api";
import { getGames } from "@/lib/db";
import { gameInputSchema, gameUpdateSchema } from "@/lib/games/schema";

export const dynamic = "force-dynamic";

// In Next.js 15+ the dynamic segment arrives as a promise.
type Context = { params: Promise<{ id: string }> };

const notFound = (id: number) => new HttpError(404, `Game ${id} not found`);

/** GET /api/games/:id */
export const GET = handle(async (_request: Request, { params }: Context) => {
  const id = parseId((await params).id);
  const game = getGames().get(id);
  if (!game) throw notFound(id);
  return Response.json(game);
});

/** PUT /api/games/:id - replace the game; every field is required. */
export const PUT = handle(async (request: Request, { params }: Context) => {
  const id = parseId((await params).id);
  const input = await parseBody(gameInputSchema, request);
  const game = getGames().update(id, input);
  if (!game) throw notFound(id);
  return Response.json(game);
});

/** PATCH /api/games/:id - change only the fields that are sent. */
export const PATCH = handle(async (request: Request, { params }: Context) => {
  const id = parseId((await params).id);
  const changes = await parseBody(gameUpdateSchema, request);
  const game = getGames().update(id, changes);
  if (!game) throw notFound(id);
  return Response.json(game);
});

/** DELETE /api/games/:id */
export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const id = parseId((await params).id);
  if (!getGames().remove(id)) throw notFound(id);
  return new Response(null, { status: 204 });
});
