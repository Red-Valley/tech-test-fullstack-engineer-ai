import { z } from 'zod';

export type ApiErrorCode = 'VALIDATION_ERROR' | 'INVALID_JSON' | 'INVALID_ID' | 'NOT_FOUND' | 'CONFIG_ERROR' | 'INTERNAL';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  issues?: Record<string, string[]>;
}

export function jsonError(status: number, code: ApiErrorCode, message: string, issues?: Record<string, string[]>): Response {
  const error: ApiError = issues ? { code, message, issues } : { code, message };
  return Response.json({ error }, { status });
}

export function validationError(error: z.ZodError): Response {
  const { formErrors, fieldErrors } = z.flattenError(error);
  // Errors with no field ("Provide at least one field") would otherwise be lost.
  const message = formErrors[0] ?? 'Request validation failed';
  return jsonError(400, 'VALIDATION_ERROR', message, fieldErrors as Record<string, string[]>);
}

/** Returns the parsed body, or null when it is malformed. A literal `null` body reads as malformed too. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Turns anything a handler throws into the INTERNAL envelope, keeping the details in the server log. */
export function withErrorEnvelope<Args extends unknown[]>(
  handler: (...args: Args) => Response | Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('Unhandled API error', error);
      return jsonError(500, 'INTERNAL', 'Something went wrong');
    }
  };
}
