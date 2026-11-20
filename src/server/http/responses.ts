import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/server/http/errors';
import type { ApiErrorDto } from '@/shared/types/game.dto';

const error = (status: number, body: ApiErrorDto) => Response.json(body, { status });

export const ok = <T>(data: T) => Response.json(data, { status: 200 });
export const created = <T>(data: T) => Response.json(data, { status: 201 });
export const noContent = () => new Response(null, { status: 204 });

export const badRequest = (message: string, fieldErrors?: Record<string, string[]>) =>
  error(400, fieldErrors ? { error: message, fieldErrors } : { error: message });
export const notFound = (message = 'Not found') => error(404, { error: message });
export const conflict = (message: string) => error(409, { error: message });
export const serviceUnavailable = (message: string) => error(503, { error: message });
// Never echoes the underlying error: internals stay in the server log.
export const serverError = () => error(500, { error: 'Something went wrong. Please try again.' });

export function validationError(zodError: z.ZodError): Response {
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(z.flattenError(zodError).fieldErrors)) {
    if (Array.isArray(messages)) fieldErrors[field] = messages;
  }
  return badRequest('Invalid request', fieldErrors);
}

/** Maps a thrown error to its HTTP response. Unknown errors are logged and become a bare 500. */
export function errorResponse(err: unknown): Response {
  if (err instanceof NotFoundError) return notFound(err.message);
  if (err instanceof ConflictError) return conflict(err.message);
  if (err instanceof z.ZodError) return validationError(err);
  console.error(err);
  return serverError();
}
