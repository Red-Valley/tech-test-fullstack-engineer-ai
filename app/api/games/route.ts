import { NextRequest, NextResponse } from "next/server";
import { getGames, createGame } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get("genre") ?? undefined;
  const minRating = searchParams.get("min_rating");

  const games = getGames({
    genre,
    min_rating: minRating ? parseFloat(minRating) : undefined,
  });

  return NextResponse.json(games);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating } = body;

  if (!title || !developer || !genre) {
    return NextResponse.json({ error: "title, developer, and genre are required" }, { status: 400 });
  }

  const game = createGame({
    title,
    developer,
    genre,
    monthly_revenue_usd: Number(monthly_revenue_usd) || 0,
    monthly_downloads: Number(monthly_downloads) || 0,
    average_rating: Math.min(5, Math.max(0, Number(average_rating) || 0)),
  });

  return NextResponse.json(game, { status: 201 });
}
