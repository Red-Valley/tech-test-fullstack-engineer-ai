// `npm run seed`: fills an empty database with SEED_GAMES.
// `npm run db:reset`: empties the table first, then seeds. It clears rows instead of deleting
// the file so a running `next dev` keeps a valid connection and shows the new data at once.
import { dbPath, openDatabase } from '@/server/db/client';
import { SEED_GAMES } from '@/server/db/seed-data';
import { createGamesRepository } from '@/server/repositories/games.repository';
import { gameInputSchema } from '@/shared/schemas/game.schema';

const file = dbPath();
const db = openDatabase(file);
const repo = createGamesRepository(db);

if (process.argv.includes('--reset')) {
  repo.deleteAll();
  console.log(`Emptied ${file}`);
}

const existing = repo.list().length;

if (existing > 0) {
  console.log(`${file} already has ${existing} games; nothing seeded. Use npm run db:reset.`);
} else {
  // Same validation as the API, so seed data can't hold a value the app would reject.
  const created = repo.createMany(SEED_GAMES.map((game) => gameInputSchema.parse(game)));
  console.log(`Seeded ${created.length} games into ${file}`);
}

db.close();
