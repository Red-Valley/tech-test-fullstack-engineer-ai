import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { initializeSchema } from '@/lib/db';
import { createUser, listUsers } from '@/lib/users-repository';

let testDb: DatabaseSync;

vi.mock('@/lib/db', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/db')>();
    return {
        ...actual,
        getDb: () => testDb,
    };
});

import { GET as usersGet, POST as usersPost } from '@/app/api/users/route';
import {
    DELETE as userDelete,
    GET as userGet,
    PATCH as userPatch,
} from '@/app/api/users/[id]/route';

function cookieFor(user: Parameters<typeof createSessionToken>[0]): string {
    return `${SESSION_COOKIE_NAME}=${createSessionToken(user)}`;
}

describe('/api/users routes', () => {
    beforeEach(() => {
        testDb = new DatabaseSync(':memory:');
        initializeSchema(testDb, true);
    });

    afterEach(() => {
        testDb.close();
    });

    it('rejects unauthenticated requests with 401', async () => {
        const res = await usersGet(new Request('http://localhost:3000/api/users'));
        expect(res.status).toBe(401);
    });

    it('allows admin to list, create, update, and delete users', async () => {
        const admin = listUsers(testDb)[0];
        const cookie = cookieFor(admin);

        const listRes = await usersGet(
            new Request('http://localhost:3000/api/users', {
                headers: { cookie },
            }),
        );
        expect(listRes.status).toBe(200);
        const listBody = (await listRes.json()) as { users: Array<{ email: string }> };
        expect(listBody.users).toHaveLength(1);

        const createRes = await usersPost(
            new Request('http://localhost:3000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', cookie },
                body: JSON.stringify({
                    name: 'Jane Doe',
                    email: 'jane@indiegames.ai',
                    password: 'secretpassword',
                    role: 'member',
                }),
            }),
        );
        expect(createRes.status).toBe(201);
        const { user: created } = (await createRes.json()) as {
            user: { id: number; name: string; role: string };
        };
        expect(created.name).toBe('Jane Doe');
        expect(created.role).toBe('member');

        // Duplicate email -> 409
        const dupRes = await usersPost(
            new Request('http://localhost:3000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', cookie },
                body: JSON.stringify({
                    name: 'Jane Two',
                    email: 'jane@indiegames.ai',
                    password: 'secretpassword',
                    role: 'member',
                }),
            }),
        );
        expect(dupRes.status).toBe(409);

        // Get by id
        const getRes = await userGet(
            new Request(`http://localhost:3000/api/users/${created.id}`, {
                headers: { cookie },
            }),
            { params: Promise.resolve({ id: String(created.id) }) },
        );
        expect(getRes.status).toBe(200);

        // Update by id
        const patchRes = await userPatch(
            new Request(`http://localhost:3000/api/users/${created.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', cookie },
                body: JSON.stringify({ name: 'Jane Updated', role: 'admin' }),
            }),
            { params: Promise.resolve({ id: String(created.id) }) },
        );
        expect(patchRes.status).toBe(200);
        const patched = (await patchRes.json()) as { user: { name: string; role: string } };
        expect(patched.user.name).toBe('Jane Updated');
        expect(patched.user.role).toBe('admin');

        // Prevent self-deletion -> 400
        const selfDeleteRes = await userDelete(
            new Request(`http://localhost:3000/api/users/${admin.id}`, {
                method: 'DELETE',
                headers: { cookie },
            }),
            { params: Promise.resolve({ id: String(admin.id) }) },
        );
        expect(selfDeleteRes.status).toBe(400);

        // Delete other user -> 200
        const delRes = await userDelete(
            new Request(`http://localhost:3000/api/users/${created.id}`, {
                method: 'DELETE',
                headers: { cookie },
            }),
            { params: Promise.resolve({ id: String(created.id) }) },
        );
        expect(delRes.status).toBe(200);
    });

    it('blocks non-admin members from creating, updating, or deleting users (403)', async () => {
        const member = createUser(
            {
                name: 'Member User',
                email: 'member@indiegames.ai',
                password: 'memberpassword',
                role: 'member',
            },
            testDb,
        );
        const cookie = cookieFor(member);

        const postRes = await usersPost(
            new Request('http://localhost:3000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', cookie },
                body: JSON.stringify({
                    name: 'Blocked',
                    email: 'blocked@indiegames.ai',
                    password: 'password123',
                }),
            }),
        );
        expect(postRes.status).toBe(403);

        const patchRes = await userPatch(
            new Request('http://localhost:3000/api/users/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', cookie },
                body: JSON.stringify({ name: 'Nope' }),
            }),
            { params: Promise.resolve({ id: '1' }) },
        );
        expect(patchRes.status).toBe(403);

        const delRes = await userDelete(
            new Request('http://localhost:3000/api/users/1', {
                method: 'DELETE',
                headers: { cookie },
            }),
            { params: Promise.resolve({ id: '1' }) },
        );
        expect(delRes.status).toBe(403);
    });
});
