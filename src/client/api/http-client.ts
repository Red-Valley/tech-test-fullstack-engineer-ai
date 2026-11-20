import type { ApiErrorDto } from '@/shared/types/game.dto';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const isApiErrorDto = (body: unknown): body is ApiErrorDto =>
  typeof body === 'object' && body !== null && typeof (body as ApiErrorDto).error === 'string';

/**
 * The only place the app calls fetch (the chat stream excepted). Returns the parsed JSON body,
 * `undefined` for 204, and throws ApiError for any non-2xx status or network failure.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return undefined as T; // callers of 204 endpoints expect void

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isApiErrorDto(body)) throw new ApiError(response.status, body.error, body.fieldErrors);
    throw new ApiError(response.status, `Request failed (${response.status})`);
  }
  return body as T; // the API contract (ARCHITECTURE.md §5.2) defines this shape
}
