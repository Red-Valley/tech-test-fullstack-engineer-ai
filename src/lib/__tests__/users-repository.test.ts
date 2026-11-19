import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from '@/lib/auth';
import { initializeSchema } from '@/lib/db';
import {
    createUser,
    deleteUser,
    DuplicateEmailError,
    getUserByEmail,
    getUserById,
    listUsers,
    updateUser,
    verifyUserCredentials,
} from '@/lib/users-repository';

describe('users-repository & auth', () => {
    let db: DatabaseSync;

    beforeEach(() => {
        db = new DatabaseSync(':memory:');
        initializeSchema(db, true);
    });

    it('seeds John Doe as the first admin user with importantpassword', () => {
        const users = listUsers(db);
        expect(users).toHaveLength(1);

        const john = users[0];
        expect(john.name).toBe('John Doe');
        expect(john.email).toBe('john.doe@indiegames.ai');
        expect(john.role).toBe('admin');
        expect('password_hash' in john).toBe(false);

        const verified = verifyUserCredentials('John.Doe@IndieGames.ai', 'importantpassword', db);
        expect(verified).not.toBeNull();
        expect(verified?.id).toBe(john.id);
    });

    it('rejects invalid credentials', () => {
        expect(verifyUserCredentials('john.doe@indiegames.ai', 'wrongpassword', db)).toBeNull();
        expect(verifyUserCredentials('nobody@indiegames.ai', 'importantpassword', db)).toBeNull();
    });

    it('creates a new user and rejects duplicate emails', () => {
        const created = createUser(
            {
                name: 'Jane Smith',
                email: 'Jane.Smith@IndieGames.ai',
                password: 'anothersecretpassword',
                role: 'member',
            },
            db,
        );

        expect(created.name).toBe('Jane Smith');
        expect(created.email).toBe('jane.smith@indiegames.ai');
        expect(created.role).toBe('member');

        expect(
            verifyUserCredentials('jane.smith@indiegames.ai', 'anothersecretpassword', db)?.id,
        ).toBe(created.id);

        expect(() =>
            createUser(
                {
                    name: 'Duplicate Jane',
                    email: 'jane.smith@indiegames.ai',
                    password: 'password123',
                    role: 'member',
                },
                db,
            ),
        ).toThrow(DuplicateEmailError);
    });

    it('updates user profile fields and optionally updates password', () => {
        const created = createUser(
            {
                name: 'Alex Rivera',
                email: 'alex@indiegames.ai',
                password: 'initialpassword',
                role: 'member',
            },
            db,
        );

        const updated = updateUser(
            created.id,
            {
                name: 'Alex R.',
                role: 'admin',
            },
            db,
        );
        expect(updated?.name).toBe('Alex R.');
        expect(updated?.role).toBe('admin');
        expect(verifyUserCredentials('alex@indiegames.ai', 'initialpassword', db)?.id).toBe(
            created.id,
        );

        updateUser(created.id, { password: 'newpassword123' }, db);
        expect(verifyUserCredentials('alex@indiegames.ai', 'initialpassword', db)).toBeNull();
        expect(verifyUserCredentials('alex@indiegames.ai', 'newpassword123', db)?.id).toBe(
            created.id,
        );
    });

    it('deletes a user by id', () => {
        const created = createUser(
            {
                name: 'Temp User',
                email: 'temp@indiegames.ai',
                password: 'temppassword',
                role: 'member',
            },
            db,
        );

        expect(getUserByEmail('temp@indiegames.ai', db)?.id).toBe(created.id);
        expect(deleteUser(created.id, db)).toBe(true);
        expect(getUserById(created.id, db)).toBeNull();
        expect(deleteUser(created.id, db)).toBe(false);
    });

    it('creates and verifies signed session tokens', () => {
        const john = listUsers(db)[0];
        const token = createSessionToken(john);
        const payload = verifySessionToken(token);

        expect(payload).not.toBeNull();
        expect(payload?.sub).toBe(john.id);
        expect(payload?.email).toBe('john.doe@indiegames.ai');
        expect(payload?.role).toBe('admin');

        expect(verifySessionToken(`${token}tampered`)).toBeNull();
        expect(verifySessionToken('invalid')).toBeNull();
    });
});
