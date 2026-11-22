import { connection, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { createRepository, DuplicateTitleError } from "@/lib/games/repository";
import { GameUpdate } from "@/lib/games/schema";

// No `runtime` export: see app/api/games/route.ts.

/** Parses the `[id]` segment. Returns `null` unless it is a positive integer. */
function parseId(raw: string): number | null {
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const invalidId = () => Response.json({ error: "Invalid game id" }, { status: 400 });
const notFound = () => Response.json({ error: "Game not found" }, { status: 404 });

/** GET /api/games/:id */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/games/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();

  await connection(); // synchronous SQLite read: keep it out of prerendering
  const game = createRepository(getDb()).get(id);
  return game ? Response.json(game) : notFound();
}

/** PATCH /api/games/:id: update any subset of fields. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/games/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = GameUpdate.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid game", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const game = createRepository(getDb()).update(id, parsed.data);
    return game ? Response.json(game) : notFound();
  } catch (err) {
    if (err instanceof DuplicateTitleError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

/** DELETE /api/games/:id */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/games/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();

  return createRepository(getDb()).remove(id) ? new Response(null, { status: 204 }) : notFound();
}
