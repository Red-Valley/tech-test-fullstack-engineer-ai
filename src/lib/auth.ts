import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { User, UserRole } from '@/types/user';

export const SESSION_COOKIE_NAME = 'indiepulse_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
    sub: number;
    email: string;
    name: string;
    role: UserRole;
    exp: number;
}

function getAuthSecret(): string {
    return process.env.AUTH_SECRET || 'indiepulse-local-dev-secret-change-in-prod';
}

export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
    const [salt, keyHex] = storedHash.split(':');
    if (!salt || !keyHex) {
        return false;
    }

    const expectedBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    if (expectedBuf.length !== derivedBuf.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuf, derivedBuf);
}

function signPayload(encodedPayload: string): string {
    return crypto.createHmac('sha256', getAuthSecret()).update(encodedPayload).digest('base64url');
}

export function createSessionToken(user: Pick<User, 'id' | 'email' | 'name' | 'role'>): string {
    const payload: SessionPayload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = signPayload(encodedPayload);
    return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
    if (!token) {
        return null;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return null;
    }

    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) {
        return null;
    }

    const expectedSig = signPayload(encodedPayload);
    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
    }

    try {
        const parsed = JSON.parse(
            Buffer.from(encodedPayload, 'base64url').toString('utf8'),
        ) as SessionPayload;
        if (
            typeof parsed.sub !== 'number' ||
            typeof parsed.exp !== 'number' ||
            parsed.exp < Math.floor(Date.now() / 1000)
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function extractSessionTokenFromCookieHeader(cookieHeader: string | null): string | null {
    if (!cookieHeader) {
        return null;
    }

    for (const part of cookieHeader.split(';')) {
        const [rawName, ...rest] = part.trim().split('=');
        if (rawName === SESSION_COOKIE_NAME) {
            return decodeURIComponent(rest.join('='));
        }
    }
    return null;
}

export function getSessionFromRequest(req: Request): SessionPayload | null {
    const token = extractSessionTokenFromCookieHeader(req.headers.get('cookie'));
    return verifySessionToken(token);
}

export async function getSessionFromServerCookies(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
}

export const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
};
