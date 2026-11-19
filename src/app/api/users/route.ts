import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { createUser, DuplicateEmailError, getUserById, listUsers } from '@/lib/users-repository';
import { CreateUserSchema } from '@/types/user';

export async function GET(req: Request) {
    const session = getSessionFromRequest(req);
    const currentUser = session ? getUserById(session.sub) : null;
    if (!currentUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const users = listUsers();
    return NextResponse.json({ users }, { status: 200 });
}

export async function POST(req: Request) {
    const session = getSessionFromRequest(req);
    const currentUser = session ? getUserById(session.sub) : null;
    if (!currentUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (currentUser.role !== 'admin') {
        return NextResponse.json(
            { error: 'Admin role is required to create users' },
            { status: 403 },
        );
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const user = createUser(parsed.data);
        return NextResponse.json({ user }, { status: 201 });
    } catch (err) {
        if (err instanceof DuplicateEmailError) {
            return NextResponse.json({ error: err.message }, { status: 409 });
        }
        throw err;
    }
}
