import { flattenFieldErrors, gameInputSchema, type FieldErrors, type GameInput } from "@/lib/db/schema";

export type ErrorCode = "validation_error" | "not_found" | "invalid_id" | "invalid_json" | "ai_not_configured";

export function jsonError(status: number, code: ErrorCode, message: string, fields?: FieldErrors): Response {
  return Response.json({ error: { code, message, ...(fields && { fields }) } }, { status });
}

export const notFound = () => jsonError(404, "not_found", "Game not found.");

/** Positive integer ids only; anything else is rejected before touching the database. */
export function parseId(param: string): number | null {
  return /^[1-9]\d*$/.test(param) ? Number(param) : null;
}

export const invalidId = () => jsonError(400, "invalid_id", "Game id must be a positive integer.");

export async function readGameInput(
  request: Request,
): Promise<{ ok: true; data: GameInput } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, "invalid_json", "Request body must be valid JSON.") };
  }
  const parsed = gameInputSchema.safeParse(body);
  if (!parsed.success) {
    const fields = flattenFieldErrors(parsed.error);
    return { ok: false, response: jsonError(400, "validation_error", "Some fields are invalid.", fields) };
  }
  return { ok: true, data: parsed.data };
}
