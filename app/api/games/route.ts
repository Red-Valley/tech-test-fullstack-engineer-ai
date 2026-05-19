import { NextResponse } from "next/server";
import { getGamesRepository } from "@/lib/games/repository";
import { gameInputSchema } from "@/lib/games/schemas";

export async function GET() {
  try {
    const games = getGamesRepository().list();
    return NextResponse.json(games);
  } catch (error) {
    console.error("GET /api/games failed:", error);
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = gameInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const game = getGamesRepository().create(parsed.data);
    return NextResponse.json(game, {
      status: 201,
      headers: { Location: `/api/games/${game.id}` },
    });
  } catch (error) {
    console.error("POST /api/games failed:", error);
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }
}
