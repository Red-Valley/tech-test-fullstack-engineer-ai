import type { ApiError, ApiIssue } from "@/lib/api";
import type { Game, GameInput } from "./schema";

/** Thin browser-side wrapper around the REST API, so components deal in typed calls and one error type. */

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiRequestError("Couldn't reach the server. Check that it is running and try again.");
  }
  if (response.ok) return response;

  const body: Partial<ApiError> = await response.json().catch(() => ({}));
  throw new ApiRequestError(body.error ?? `The request failed (${response.status}).`, body.issues);
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function createGame(input: GameInput): Promise<Game> {
  return (await request("/api/games", jsonInit("POST", input))).json();
}

export async function updateGame(id: number, input: GameInput): Promise<Game> {
  return (await request(`/api/games/${id}`, jsonInit("PUT", input))).json();
}

export async function deleteGame(id: number): Promise<void> {
  await request(`/api/games/${id}`, { method: "DELETE" });
}
