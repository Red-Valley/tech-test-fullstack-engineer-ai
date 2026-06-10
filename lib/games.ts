import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface Game {
  id: string;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number;
}

const gamesFilePath = path.join(process.cwd(), "data", "games.json");

async function readGames(): Promise<Game[]> {
  try {
    const fileContents = await fs.readFile(gamesFilePath, "utf8");
    return JSON.parse(fileContents) as Game[];
  } catch {
    return [];
  }
}

async function writeGames(games: Game[]): Promise<void> {
  await fs.writeFile(gamesFilePath, `${JSON.stringify(games, null, 2)}\n`, "utf8");
}

export async function getGames(): Promise<Game[]> {
  return readGames();
}

export async function getGameById(id: string): Promise<Game | null> {
  const games = await readGames();
  return games.find((game) => game.id === id) ?? null;
}

export async function createGame(input: Omit<Game, "id"> & { id?: string }): Promise<Game> {
  const games = await readGames();
    const newId = input.id ?? randomUUID();
  const newGame: Game = {
    id: newId,
    title: input.title,
    developer: input.developer,
    genre: input.genre,
    monthly_revenue_usd: input.monthly_revenue_usd,
    monthly_downloads: input.monthly_downloads,
    average_rating: input.average_rating,
  };

  games.push(newGame);
  await writeGames(games);
  return newGame;
}

export async function updateGame(id: string, updates: Partial<Omit<Game, "id">>): Promise<Game | null> {
  const games = await readGames();
  const gameIndex = games.findIndex((game) => game.id === id);

  if (gameIndex === -1) {
    return null;
  }

  const updatedGame: Game = {
    ...games[gameIndex],
    ...updates,
    id,
  };

  games[gameIndex] = updatedGame;
  await writeGames(games);
  return updatedGame;
}

export async function deleteGame(id: string): Promise<boolean> {
  const games = await readGames();
  const gameIndex = games.findIndex((game) => game.id === id);

  if (gameIndex === -1) {
    return false;
  }

  games.splice(gameIndex, 1);
  await writeGames(games);
  return true;
}
