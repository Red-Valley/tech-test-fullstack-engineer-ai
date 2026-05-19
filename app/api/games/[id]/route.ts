import { NextResponse } from "next/server";
import { getGamesRepository } from "@/lib/games/repository";
import { gameUpdateSchema } from "@/lib/games/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const game = getGamesRepository().findById(id);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    return NextResponse.json(game);
  } catch (error) {
    console.error("GET /api/games/[id] failed:", error);
    return NextResponse.json({ error: "Failed to fetch game" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = gameUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const game = getGamesRepository().update(id, parsed.data);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    return NextResponse.json(game);
  } catch (error) {
    console.error("PUT /api/games/[id] failed:", error);
    return NextResponse.json({ error: "Failed to update game" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deleted = getGamesRepository().delete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/games/[id] failed:", error);
    return NextResponse.json({ error: "Failed to delete game" }, { status: 500 });
  }
}
