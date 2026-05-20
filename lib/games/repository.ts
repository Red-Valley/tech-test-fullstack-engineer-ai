import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import {
  gameCreateSchema,
  gameSchema,
  gameUpdateSchema,
  type Game,
  type GameCreate,
  type GameUpdate,
  type Genre,
} from './schema';

// rename(2) is only atomic within the same filesystem, so the tmp path
// must live in the same directory as the final path.
const DATA_PATH = join(process.cwd(), 'data', 'games.json');
const TMP_PATH = `${DATA_PATH}.tmp`;

export class RepositoryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'RepositoryError';
  }
}

async function readAll(): Promise<Game[]> {
  let raw: string;
  try {
    raw = await readFile(DATA_PATH, 'utf-8');
  } catch (err) {
    throw new RepositoryError(`Failed to read ${DATA_PATH}`, err);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new RepositoryError(`Invalid JSON in ${DATA_PATH}`, err);
  }

  const arrayResult = z.array(gameSchema).safeParse(parsed);
  if (!arrayResult.success) {
    throw new RepositoryError(
      `Invalid catalog data in ${DATA_PATH}`,
      arrayResult.error,
    );
  }
  return arrayResult.data;
}

async function writeAll(games: Game[]): Promise<void> {
  try {
    await writeFile(TMP_PATH, JSON.stringify(games, null, 2) + '\n', 'utf-8');
    await rename(TMP_PATH, DATA_PATH);
  } catch (err) {
    throw new RepositoryError(`Failed to write ${DATA_PATH}`, err);
  }
}

// Slug rules per plan: lowercase, strip apostrophes (so "Don't" → "dont"),
// collapse remaining non-alphanumeric runs to a single hyphen, trim hyphens.
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nextAvailableId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) {
    i++;
  }
  return `${base}-${i}`;
}

export async function listGames(filters?: {
  genre?: Genre;
  minRating?: number;
}): Promise<Game[]> {
  const games = await readAll();
  if (!filters) return games;
  return games.filter((g) => {
    if (filters.genre !== undefined && g.genre !== filters.genre) return false;
    if (
      filters.minRating !== undefined &&
      g.average_rating < filters.minRating
    ) {
      return false;
    }
    return true;
  });
}

export async function getGameById(id: string): Promise<Game | null> {
  const games = await readAll();
  return games.find((g) => g.id === id) ?? null;
}

export async function createGame(input: GameCreate): Promise<Game> {
  const parsed = gameCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new RepositoryError('Invalid game input', parsed.error);
  }

  const games = await readAll();
  const existing = new Set(games.map((g) => g.id));
  const baseSlug = slugify(parsed.data.title);
  const id = nextAvailableId(baseSlug, existing);

  const candidate: Game = { id, ...parsed.data };
  const finalParse = gameSchema.safeParse(candidate);
  if (!finalParse.success) {
    throw new RepositoryError(
      'Generated game record failed validation',
      finalParse.error,
    );
  }

  games.push(finalParse.data);
  await writeAll(games);
  return finalParse.data;
}

export async function updateGame(
  id: string,
  patch: GameUpdate,
): Promise<Game | null> {
  const parsed = gameUpdateSchema.safeParse(patch);
  if (!parsed.success) {
    throw new RepositoryError('Invalid update patch', parsed.error);
  }

  const games = await readAll();
  const index = games.findIndex((g) => g.id === id);
  if (index === -1) return null;

  // Explicit id at the end pins the original id even if a stray id field
  // ever slipped past gameUpdateSchema (defense in depth).
  const merged: Game = {
    ...games[index],
    ...parsed.data,
    id: games[index].id,
  };

  const finalParse = gameSchema.safeParse(merged);
  if (!finalParse.success) {
    throw new RepositoryError(
      'Merged record failed validation',
      finalParse.error,
    );
  }

  games[index] = finalParse.data;
  await writeAll(games);
  return finalParse.data;
}

export async function deleteGame(id: string): Promise<boolean> {
  const games = await readAll();
  const index = games.findIndex((g) => g.id === id);
  if (index === -1) return false;
  games.splice(index, 1);
  await writeAll(games);
  return true;
}
