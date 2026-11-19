import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getUserById } from '@/lib/users-repository';

export async function GET(req: Request) {
    const session = getSessionFromRequest(req);
    if (!session) {
        return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = getUserById(session.sub);
    if (!user) {
        return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 });
}
