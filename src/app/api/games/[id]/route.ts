import type { NextRequest } from 'next/server';
import { parseId, parseJsonBody } from '@/server/http/request';
import { errorResponse, noContent, ok } from '@/server/http/responses';
import { getGamesService } from '@/server/services/games.service';
import { gameInputSchema } from '@/shared/schemas/game.schema';

export const runtime = 'nodejs';

type Context = RouteContext<'/api/games/[id]'>;

export async function GET(_request: NextRequest, ctx: Context) {
  const id = parseId((await ctx.params).id);
  if (!id.ok) return id.response;
  try {
    return ok(getGamesService().getGame(id.data));
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT is a full replacement (ARCHITECTURE.md §5.2), so it validates the complete input.
export async function PUT(request: NextRequest, ctx: Context) {
  const id = parseId((await ctx.params).id);
  if (!id.ok) return id.response;
  const body = await parseJsonBody(request, gameInputSchema);
  if (!body.ok) return body.response;
  try {
    return ok(getGamesService().updateGame(id.data, body.data));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: Context) {
  const id = parseId((await ctx.params).id);
  if (!id.ok) return id.response;
  try {
    getGamesService().deleteGame(id.data);
    return noContent();
  } catch (error) {
    return errorResponse(error);
  }
}
