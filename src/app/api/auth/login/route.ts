import { NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth';
import { verifyUserCredentials } from '@/lib/users-repository';
import { LoginSchema } from '@/types/user';

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const user = verifyUserCredentials(parsed.data.email, parsed.data.password);
    if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isHttps =
        req.headers.get('x-forwarded-proto') === 'https' || req.url.startsWith('https://');
    const token = createSessionToken(user);
    const response = NextResponse.json({ user }, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
        ...SESSION_COOKIE_OPTIONS,
        secure: isHttps,
    });
    return response;
}
