// `npm run eval:db`: rebuilds data/eval.db from the test fixture, so evals always run on the
// same data no matter what is edited in the dashboard (ARCHITECTURE.md §7.3).
import { rmSync } from 'node:fs';
import { openDatabase } from '@/server/db/client';
import { createGamesRepository } from '@/server/repositories/games.repository';
import { gameInputSchema } from '@/shared/schemas/game.schema';
import { GAMES_FIXTURE } from '../tests/fixtures/games.fixture';

export const EVAL_DB_PATH = 'data/eval.db';

// Only the eval DB is ever deleted here; this script never touches data/games.db.
for (const suffix of ['', '-wal', '-shm']) rmSync(`${EVAL_DB_PATH}${suffix}`, { force: true });

const db = openDatabase(EVAL_DB_PATH);
const created = createGamesRepository(db).createMany(
  GAMES_FIXTURE.map((game) => gameInputSchema.parse(game)),
);
db.close();
console.log(`Built ${EVAL_DB_PATH} with ${created.length} fixture games.`);
