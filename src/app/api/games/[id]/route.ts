import { connection } from "next/server";
import { invalidId, notFound, parseId, readGameInput } from "@/lib/api/http";
import { getRepository } from "@/lib/games/repository";

export async function GET(_request: Request, ctx: RouteContext<"/api/games/[id]">) {
  await connection();
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();
  const game = getRepository().getGame(id);
  return game ? Response.json(game) : notFound();
}

// Existence is checked before the body is validated, so editing a game that was deleted
// elsewhere always answers 404.

export async function PUT(request: Request, ctx: RouteContext<"/api/games/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();
  const repository = getRepository();
  if (!repository.getGame(id)) return notFound();

  const input = await readGameInput(request);
  if (!input.ok) return input.response;
  const game = repository.updateGame(id, input.data);
  return game ? Response.json(game) : notFound();
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/games/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return invalidId();
  return getRepository().deleteGame(id) ? new Response(null, { status: 204 }) : notFound();
}
