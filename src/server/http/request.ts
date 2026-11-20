import { z } from 'zod';
import { badRequest, validationError } from '@/server/http/responses';

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

/** Reads a JSON body and validates it. Malformed JSON and schema failures both become a 400. */
export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<Parsed<z.output<T>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: badRequest('Request body must be valid JSON') };
  }
  const result = schema.safeParse(body);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, response: validationError(result.error) };
}

// Digits only: plain coercion would also accept "0x1A", "1e1" or " 5 " as ids.
const idSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive());

/** Route ids arrive as strings; anything but a positive integer is a 400, not a 404. */
export function parseId(raw: string): Parsed<number> {
  const result = idSchema.safeParse(raw);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, response: badRequest('Game id must be a positive integer') };
}
