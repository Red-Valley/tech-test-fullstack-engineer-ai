import type { DatabaseSync } from 'node:sqlite';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';
import type { CreateUserInput, UpdateUserInput, User, UserRole } from '@/types/user';

interface UserRow {
    id: number;
    name: string;
    email: string;
    password_hash: string;
    role: string;
    created_at: string;
    updated_at: string;
}

export class DuplicateEmailError extends Error {
    constructor(email: string) {
        super(`A user with email "${email}" already exists.`);
        this.name = 'DuplicateEmailError';
    }
}

const PUBLIC_USER_COLUMNS = 'id, name, email, role, created_at, updated_at';

function toPublicUser(row: Omit<UserRow, 'password_hash'>): User {
    return {
        id: Number(row.id),
        name: row.name,
        email: row.email,
        role: row.role === 'admin' ? 'admin' : ('member' as UserRole),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function listUsers(db: DatabaseSync = getDb()): User[] {
    const rows = db
        .prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users ORDER BY id ASC`)
        .all() as unknown as Array<Omit<UserRow, 'password_hash'>>;
    return rows.map(toPublicUser);
}

export function getUserById(id: number, db: DatabaseSync = getDb()): User | null {
    const row = db
        .prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = :id`)
        .get({ id }) as unknown as Omit<UserRow, 'password_hash'> | undefined;
    return row ? toPublicUser(row) : null;
}

export function getUserByEmail(email: string, db: DatabaseSync = getDb()): User | null {
    const row = db
        .prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE LOWER(email) = LOWER(:email)`)
        .get({ email: email.trim() }) as unknown as Omit<UserRow, 'password_hash'> | undefined;
    return row ? toPublicUser(row) : null;
}

export function verifyUserCredentials(
    email: string,
    password: string,
    db: DatabaseSync = getDb(),
): User | null {
    const row = db
        .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(:email)')
        .get({ email: email.trim() }) as unknown as UserRow | undefined;

    if (!row) {
        return null;
    }

    if (!verifyPassword(password, row.password_hash)) {
        return null;
    }

    return toPublicUser(row);
}

export function createUser(input: CreateUserInput, db: DatabaseSync = getDb()): User {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = getUserByEmail(normalizedEmail, db);
    if (existing) {
        throw new DuplicateEmailError(normalizedEmail);
    }

    const passwordHash = hashPassword(input.password);
    const result = db
        .prepare(
            `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (:name, :email, :password_hash, :role)
    `,
        )
        .run({
            name: input.name.trim(),
            email: normalizedEmail,
            password_hash: passwordHash,
            role: input.role ?? 'member',
        });

    const created = getUserById(Number(result.lastInsertRowid), db);
    if (!created) {
        throw new Error('Failed to retrieve newly created user');
    }
    return created;
}

export function updateUser(
    id: number,
    input: UpdateUserInput,
    db: DatabaseSync = getDb(),
): User | null {
    const existing = getUserById(id, db);
    if (!existing) {
        return null;
    }

    if (input.email !== undefined) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const owner = getUserByEmail(normalizedEmail, db);
        if (owner && owner.id !== id) {
            throw new DuplicateEmailError(normalizedEmail);
        }
    }

    const setClauses: string[] = [];
    const params: Record<string, string | number> = { id };

    if (input.name !== undefined) {
        setClauses.push('name = :name');
        params.name = input.name.trim();
    }
    if (input.email !== undefined) {
        setClauses.push('email = :email');
        params.email = input.email.trim().toLowerCase();
    }
    if (input.role !== undefined) {
        setClauses.push('role = :role');
        params.role = input.role;
    }
    if (input.password !== undefined && input.password.length > 0) {
        setClauses.push('password_hash = :password_hash');
        params.password_hash = hashPassword(input.password);
    }

    if (setClauses.length === 0) {
        return existing;
    }

    setClauses.push("updated_at = datetime('now')");
    db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = :id`).run(params);

    return getUserById(id, db);
}

export function deleteUser(id: number, db: DatabaseSync = getDb()): boolean {
    const result = db.prepare('DELETE FROM users WHERE id = :id').run({ id });
    return Number(result.changes) > 0;
}
