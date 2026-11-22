import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getGamesService } from '@/lib/services/games-service';

export const runtime = 'nodejs';

/**
 * GET /api/games
 * Query params: search, genre, rating_above, min_rating, max_rating, min_revenue, sort_by, order, limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const queryFilters = {
      search: searchParams.get('search') || undefined,
      genre: searchParams.get('genre') || undefined,
      rating_above: searchParams.get('rating_above') ? Number(searchParams.get('rating_above')) : undefined,
      min_rating: searchParams.get('min_rating') ? Number(searchParams.get('min_rating')) : undefined,
      max_rating: searchParams.get('max_rating') ? Number(searchParams.get('max_rating')) : undefined,
      min_revenue: searchParams.get('min_revenue') ? Number(searchParams.get('min_revenue')) : undefined,
      sort_by: searchParams.get('sort_by') || undefined,
      order: searchParams.get('order') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
    };

    const service = getGamesService();
    const result = service.listGames(queryFilters);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data.games, total: result.data.total },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/games error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching games' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/games
 * Creates a new game record. Validates all 6 required fields via Zod.
 * Returns HTTP 201 on success.
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload' },
        { status: 400 }
      );
    }

    const service = getGamesService();
    const result = service.createGame(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/games error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating game' },
      { status: 500 }
    );
  }
}
