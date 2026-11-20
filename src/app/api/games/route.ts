import { z } from "zod";
import { handle, parseBody, parseWith } from "@/lib/api";
import { getGames } from "@/lib/db";
import { gameInputSchema, SORT_FIELDS } from "@/lib/games/schema";

// The catalog changes at runtime, so never prerender or cache this route.
export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  genre: z.string().trim().optional(),
  sort: z.enum(SORT_FIELDS).default("title"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

/** GET /api/games?q=&genre=&sort=&order= - list games, optionally filtered and sorted. */
export const GET = handle(async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const query = parseWith(listQuerySchema, {
    q: params.get("q") ?? undefined,
    genre: params.get("genre") ?? undefined,
    sort: params.get("sort") ?? undefined,
    order: params.get("order") ?? undefined,
  });

  const { games } = getGames().list({ search: query.q, genre: query.genre, sortBy: query.sort, order: query.order });
  return Response.json(games);
});

/** POST /api/games - create a game. */
export const POST = handle(async (request: Request) => {
  const input = await parseBody(gameInputSchema, request);
  const game = getGames().create(input);
  return Response.json(game, { status: 201, headers: { Location: `/api/games/${game.id}` } });
});
