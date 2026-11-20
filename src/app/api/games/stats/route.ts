import { errorResponse, ok } from '@/server/http/responses';
import { getGamesService } from '@/server/services/games.service';

export const runtime = 'nodejs';
// This handler reads nothing from the request, so without this Next could prerender it at
// build time and serve stale KPIs.
export const dynamic = 'force-dynamic';

export function GET() {
  try {
    return ok(getGamesService().getStats());
  } catch (error) {
    return errorResponse(error);
  }
}
