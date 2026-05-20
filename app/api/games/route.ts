import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGame, listGames } from '@/lib/games/repository';
import { GENRES, gameCreateSchema } from '@/lib/games/schema';
import { formatZodError, handleUnknownError } from '@/lib/api/helpers';

const querySchema = z.object({
  genre: z.enum(GENRES).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      genre: url.searchParams.get('genre') || undefined,
      minRating: url.searchParams.get('minRating') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: formatZodError(parsed.error),
        },
        { status: 400 },
      );
    }
    const games = await listGames(parsed.data);
    return NextResponse.json(games, { status: 200 });
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = gameCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: formatZodError(parsed.error),
        },
        { status: 400 },
      );
    }
    const created = await createGame(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleUnknownError(err);
  }
}
