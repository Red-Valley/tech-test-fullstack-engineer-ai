import { NextResponse } from "next/server";
import { createGame, deleteGame, getGameById, getGames, updateGame } from "../../../lib/games";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const game = await getGameById(id);

      if (!game) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 });
      }

      return NextResponse.json(game);
    }

    const games = await getGames();
    return NextResponse.json(games);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const game = await createGame(body);
    return NextResponse.json(game, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing game id" }, { status: 400 });
    }

    const body = await request.json();
    const updated = await updateGame(id, body);

    if (!updated) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing game id" }, { status: 400 });
    }

    const deleted = await deleteGame(id);

    if (!deleted) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}