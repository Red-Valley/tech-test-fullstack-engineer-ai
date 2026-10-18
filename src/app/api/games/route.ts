import { connection } from "next/server";
import { readGameInput } from "@/lib/api/http";
import { getRepository } from "@/lib/games/repository";

export async function GET() {
  // better-sqlite3 is synchronous: without this the list would be prerendered at build time.
  await connection();
  return Response.json(getRepository().listGames());
}

export async function POST(request: Request) {
  const input = await readGameInput(request);
  if (!input.ok) return input.response;
  return Response.json(getRepository().createGame(input.data), { status: 201 });
}
