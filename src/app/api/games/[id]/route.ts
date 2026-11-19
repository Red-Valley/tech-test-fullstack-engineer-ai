import { NextResponse } from 'next/server';
import { deleteGame, getGameById, updateGame } from '@/lib/games-repository';
import { UpdateGameSchema } from '@/types/game';

type RouteContext = {
    params: Promise<{ id: string }>;
};

function parsePositiveIntId(rawId: string): number | null {
    if (!/^\d+$/.test(rawId)) {
        return null;
    }
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return null;
    }
    return id;
}

async function handleUpdate(req: Request, context: RouteContext) {
    const { id: rawId } = await context.params;
    const id = parsePositiveIntId(rawId);
    if (id === null) {
        return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = UpdateGameSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const game = updateGame(id, parsed.data);
    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game }, { status: 200 });
}

export async function GET(_req: Request, context: RouteContext) {
    const { id: rawId } = await context.params;
    const id = parsePositiveIntId(rawId);
    if (id === null) {
        return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });
    }

    const game = getGameById(id);
    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game }, { status: 200 });
}

export async function PATCH(req: Request, context: RouteContext) {
    return handleUpdate(req, context);
}

export async function PUT(req: Request, context: RouteContext) {
    return handleUpdate(req, context);
}

export async function DELETE(_req: Request, context: RouteContext) {
    const { id: rawId } = await context.params;
    const id = parsePositiveIntId(rawId);
    if (id === null) {
        return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });
    }

    const deleted = deleteGame(id);
    if (!deleted) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, id }, { status: 200 });
}
