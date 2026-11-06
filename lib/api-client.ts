import { z } from 'zod';
import { API_ERROR_CODES, type ApiError } from './http';
import type { Game, GameInput } from './types';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError };

const errorBodySchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    issues: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

const NETWORK_ERROR: ApiError = { code: 'INTERNAL', message: 'Could not reach the server. Check your connection and try again.' };
const UNEXPECTED_ERROR: ApiError = { code: 'INTERNAL', message: 'The server sent an unexpected response. Please try again.' };

const readBody = (res: Response): Promise<unknown> => res.json().catch(() => undefined);

// Expected failures come back as a value and never throw, so the UI has to handle both branches.
async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }

  if (res.status === 204) return { ok: true, data: undefined as T };

  const body = await readBody(res);
  if (res.ok) {
    return body === undefined ? { ok: false, status: res.status, error: UNEXPECTED_ERROR } : { ok: true, data: body as T };
  }
  const parsed = errorBodySchema.safeParse(body);
  return { ok: false, status: res.status, error: parsed.success ? parsed.data.error : UNEXPECTED_ERROR };
}

const jsonInit = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const createGame = (input: GameInput): Promise<ApiResult<Game>> => request('/api/games', jsonInit('POST', input));

export const updateGame = (id: number, input: Partial<GameInput>): Promise<ApiResult<Game>> =>
  request(`/api/games/${id}`, jsonInit('PUT', input));

export const deleteGame = (id: number): Promise<ApiResult<void>> => request(`/api/games/${id}`, { method: 'DELETE' });
