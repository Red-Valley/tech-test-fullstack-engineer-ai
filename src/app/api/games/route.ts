import { NextResponse } from 'next/server';
import { createGame, getCatalogStats, listGames } from '@/lib/games-repository';
import { CreateGameSchema, type GameListFilter } from '@/types/game';

const VALID_SORT_COLUMNS = new Set<NonNullable<GameListFilter['sortBy']>>([
    'title',
    'developer',
    'genre',
    'monthly_revenue_usd',
    'monthly_downloads',
    'average_rating',
    'updated_at',
]);

function parseOptionalNumber(value: string | null): number | undefined {
    if (value === null || value.trim() === '') {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') ?? undefined;
    const genre = searchParams.get('genre') ?? undefined;
    const minRating = parseOptionalNumber(searchParams.get('minRating'));
    const maxRating = parseOptionalNumber(searchParams.get('maxRating'));
    const limit = parseOptionalNumber(searchParams.get('limit'));

    const rawSortBy = searchParams.get('sortBy');
    const sortBy =
        rawSortBy && VALID_SORT_COLUMNS.has(rawSortBy as NonNullable<GameListFilter['sortBy']>)
            ? (rawSortBy as GameListFilter['sortBy'])
            : undefined;

    const rawSortOrder = searchParams.get('sortOrder');
    const sortOrder = rawSortOrder === 'asc' || rawSortOrder === 'desc' ? rawSortOrder : undefined;

    const filter: GameListFilter = {
        search,
        genre,
        minRating,
        maxRating,
        sortBy,
        sortOrder,
        limit,
    };

    const games = listGames(filter);
    const stats = getCatalogStats();

    return NextResponse.json({ games, stats }, { status: 200 });
}

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = CreateGameSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const game = createGame(parsed.data);
    return NextResponse.json({ game }, { status: 201 });
}
