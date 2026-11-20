import type { z } from "zod";
import { DuplicateTitleError } from "@/lib/games/repository";

/** Per-field validation problem, shaped for the form to show next to the right input. */
export interface ApiIssue {
  field: string;
  message: string;
}

/** Every error response from the API has this body: `{ error: string, issues?: ApiIssue[] }`. */
export interface ApiError {
  error: string;
  issues?: ApiIssue[];
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues?: ApiIssue[],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function toIssues(error: z.ZodError): ApiIssue[] {
  return error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
}

export function parseWith<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, "Validation failed", toIssues(result.error));
  return result.data;
}

export async function parseBody<T extends z.ZodType>(schema: T, request: Request): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  return parseWith(schema, body);
}

/** Ids are positive integers; anything else is a client error rather than a "not found". */
export function parseId(raw: string): number {
  if (!/^[1-9]\d{0,14}$/.test(raw)) throw new HttpError(400, "Game id must be a positive integer");
  return Number(raw);
}

/**
 * Wraps a route handler so thrown errors become consistent JSON responses:
 * HttpError -> its status, duplicate title -> 409, anything else -> a generic 500 (details go to the log).
 */
export function handle<Args extends unknown[]>(handler: (...args: Args) => Promise<Response> | Response) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) {
        const body: ApiError = error.issues ? { error: error.message, issues: error.issues } : { error: error.message };
        return Response.json(body, { status: error.status });
      }
      if (error instanceof DuplicateTitleError) {
        return Response.json({ error: error.message, issues: [{ field: "title", message: error.message }] } satisfies ApiError, {
          status: 409,
        });
      }
      console.error("Unhandled API error:", error);
      return Response.json({ error: "Internal server error" } satisfies ApiError, { status: 500 });
    }
  };
}
