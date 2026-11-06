import { z } from 'zod';

/** Machine codes of the error envelope that the chat route can answer with. */
type ChatErrorCode = 'VALIDATION_ERROR' | 'INVALID_JSON' | 'CONFIG_ERROR' | 'INTERNAL';

/** Thrown when the active LLM provider cannot be used. Its message is safe to show. */
export class ChatConfigError extends Error {
  override readonly name = 'ChatConfigError';
}

// Private to the chat route on purpose: lib/http.ts belongs to the CRUD track.
export function jsonError(
  status: number,
  code: ChatErrorCode,
  message: string,
  issues?: Record<string, string[] | undefined>,
): Response {
  return Response.json({ error: { code, message, ...(issues ? { issues } : {}) } }, { status });
}

export function validationError(issues: Record<string, string[] | undefined>): Response {
  return jsonError(400, 'VALIDATION_ERROR', 'Request validation failed', issues);
}

export function zodValidationError(error: z.ZodError): Response {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return validationError({ ...fieldErrors, ...(formErrors.length ? { body: formErrors } : {}) });
}
