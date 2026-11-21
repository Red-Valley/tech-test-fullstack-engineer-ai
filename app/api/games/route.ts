import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { createRepository, DuplicateTitleError } from "@/lib/games/repository";
import { GameInput } from "@/lib/games/schema";

// No `runtime` export: Cache Components is enabled in next.config.ts, and the
// Next.js 16 docs say to omit `runtime` there. Route handlers run on the
// Node.js runtime by default, which better-sqlite3 needs.

/** GET /api/games: list every game. */
export async function GET() {
  // better-sqlite3 is synchronous, so with Cache Components the query would
  // run during prerender and freeze the result into the build. connection()
  // defers it to request time.
  await connection();
  return Response.json(createRepository(getDb()).list());
}

/** POST /api/games: create a game. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = GameInput.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid game", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const game = createRepository(getDb()).create(parsed.data);
    return Response.json(game, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateTitleError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
