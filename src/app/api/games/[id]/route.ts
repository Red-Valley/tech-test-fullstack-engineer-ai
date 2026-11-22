import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getGamesService } from '@/lib/services/games-service';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/games/[id]
 * Retrieves a single game by ID. Returns 404 if not found.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const service = getGamesService();
    const result = service.getGameById(id);

    if (!result.success) {
      const status = result.notFound ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (error) {
    console.error('GET /api/games/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching game' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/games/[id]
 * Partially updates an existing game. Validates fields with Zod.
 * Returns 404 if not found, 400 if validation fails, 200 on success.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

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
    const result = service.updateGame(id, body);

    if (!result.success) {
      const status = result.notFound ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status }
      );
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/games/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating game' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/games/[id]
 * Deletes a game record. Returns 404 if not found, 200 on success.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const service = getGamesService();
    const result = service.deleteGame(id);

    if (!result.success) {
      const status = result.notFound ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json(
      { success: true, message: 'Game successfully deleted', data: result.data },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/games/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while deleting game' },
      { status: 500 }
    );
  }
}
