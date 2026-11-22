import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '@/lib/db';
import { GamesRepository } from '@/lib/repositories/games-repository';
import type { CreateGameInput } from '@/lib/types';

interface SeedDataFile {
  _meta?: { notice: string };
  games: (CreateGameInput & { id: string })[];
}

/**
 * Idempotently seeds the database from data/seed-data.json.
 * Supports passing a custom database instance for isolated test fixtures.
 */
export function seedDatabase(customDb?: DatabaseSync): { seeded: number; total: number } {
  const seedFilePath = path.join(process.cwd(), 'data', 'seed-data.json');
  if (!fs.existsSync(seedFilePath)) {
    throw new Error(`Seed data file not found at: ${seedFilePath}`);
  }

  const raw = fs.readFileSync(seedFilePath, 'utf8');
  const data = JSON.parse(raw) as SeedDataFile;

  const repo = new GamesRepository(customDb || getDatabase());
  let seededCount = 0;

  for (const game of data.games) {
    const existing = repo.findById(game.id);
    if (!existing) {
      repo.create({
        id: game.id,
        title: game.title,
        developer: game.developer,
        genre: game.genre,
        monthly_revenue_usd: game.monthly_revenue_usd,
        monthly_downloads: game.monthly_downloads,
        average_rating: game.average_rating,
      });
      seededCount++;
    }
  }

  const total = repo.count();
  return { seeded: seededCount, total };
}

// Allow direct CLI execution: node/tsx src/lib/seed.ts
if (process.argv[1]?.endsWith('seed.ts')) {
  try {
    const result = seedDatabase();
    console.log(`[Seed] Successfully seeded ${result.seeded} games (total in catalog: ${result.total})`);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
}
