import { NextResponse } from 'next/server';
import { deleteGame, getGameById, updateGame } from '@/lib/games/repository';
import { gameUpdateSchema } from '@/lib/games/schema';
import { formatZodError, handleUnknownError } from '@/lib/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const game = await getGameById(id);
    if (game === null) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    return NextResponse.json(game, { status: 200 });
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = gameUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: formatZodError(parsed.error),
        },
        { status: 400 },
      );
    }
    const updated = await updateGame(id, parsed.data);
    if (updated === null) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { id } = await params;
    const deleted = await deleteGame(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleUnknownError(err);
  }
}
