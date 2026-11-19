import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { deleteUser, DuplicateEmailError, getUserById, updateUser } from '@/lib/users-repository';
import { UpdateUserSchema } from '@/types/user';

function parseId(rawId: string): number | null {
    const num = Number(rawId);
    if (!Number.isInteger(num) || num <= 0) {
        return null;
    }
    return num;
}

function getAuthenticatedUser(req: Request) {
    const session = getSessionFromRequest(req);
    return session ? getUserById(session.sub) : null;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
        return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const user = getUserById(id);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
}

async function handleUpdate(req: Request, context: { params: Promise<{ id: string }> }) {
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (currentUser.role !== 'admin') {
        return NextResponse.json(
            { error: 'Admin role is required to update users' },
            { status: 403 },
        );
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
        return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const user = updateUser(id, parsed.data);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ user }, { status: 200 });
    } catch (err) {
        if (err instanceof DuplicateEmailError) {
            return NextResponse.json({ error: err.message }, { status: 409 });
        }
        throw err;
    }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    return handleUpdate(req, context);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    return handleUpdate(req, context);
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (currentUser.role !== 'admin') {
        return NextResponse.json(
            { error: 'Admin role is required to delete users' },
            { status: 403 },
        );
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
        return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    if (id === currentUser.id) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const deleted = deleteUser(id);
    if (!deleted) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, id }, { status: 200 });
}
