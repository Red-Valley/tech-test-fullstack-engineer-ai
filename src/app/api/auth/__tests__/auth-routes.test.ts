import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '@/lib/db';

let testDb: DatabaseSync;

vi.mock('@/lib/db', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/db')>();
    return {
        ...actual,
        getDb: () => testDb,
    };
});

import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as meGet } from '@/app/api/auth/me/route';

describe('/api/auth routes', () => {
    beforeEach(() => {
        testDb = new DatabaseSync(':memory:');
        initializeSchema(testDb, true);
    });

    afterEach(() => {
        testDb.close();
    });

    it('POST /api/auth/login authenticates seeded John Doe and sets session cookie', async () => {
        const req = new Request('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'john.doe@indiegames.ai',
                password: 'importantpassword',
            }),
        });

        const res = await loginPost(req);
        expect(res.status).toBe(200);

        const data = (await res.json()) as {
            user: { name: string; email: string; role: string };
        };
        expect(data.user.name).toBe('John Doe');
        expect(data.user.email).toBe('john.doe@indiegames.ai');
        expect(data.user.role).toBe('admin');

        const setCookie = res.headers.get('set-cookie');
        expect(setCookie).toContain('indiepulse_session=');
        expect(setCookie).toContain('HttpOnly');
    });

    it('POST /api/auth/login rejects invalid credentials and malformed payloads', async () => {
        const badPasswordReq = new Request('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'john.doe@indiegames.ai',
                password: 'wrongpassword',
            }),
        });
        expect((await loginPost(badPasswordReq)).status).toBe(401);

        const invalidBodyReq = new Request('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'not-an-email', password: '' }),
        });
        expect((await loginPost(invalidBodyReq)).status).toBe(400);
    });

    it('GET /api/auth/me returns null when unauthenticated and user when signed in', async () => {
        const anonRes = await meGet(new Request('http://localhost:3000/api/auth/me'));
        expect(anonRes.status).toBe(200);
        expect(await anonRes.json()).toEqual({ user: null });

        const loginRes = await loginPost(
            new Request('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'john.doe@indiegames.ai',
                    password: 'importantpassword',
                }),
            }),
        );
        const cookieHeader = loginRes.headers.get('set-cookie')?.split(';')[0] ?? '';

        const authedRes = await meGet(
            new Request('http://localhost:3000/api/auth/me', {
                headers: { cookie: cookieHeader },
            }),
        );
        expect(authedRes.status).toBe(200);
        const body = (await authedRes.json()) as { user: { email: string } | null };
        expect(body.user?.email).toBe('john.doe@indiegames.ai');
    });

    it('POST /api/auth/logout clears the session cookie', async () => {
        const res = await logoutPost();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
        expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    });
});
