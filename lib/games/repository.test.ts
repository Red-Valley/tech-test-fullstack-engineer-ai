import {
  createGame,
  deleteGame,
  getGameById,
  listGames,
  updateGame,
} from './repository';
import type { GameCreate } from './schema';

const TEST_ID = 'repo-smoke-test';

const TEST_INPUT: GameCreate = {
  title: 'Repo Smoke Test',
  developer: 'Test Dev',
  genre: 'Puzzle',
  monthly_revenue_usd: 1000,
  monthly_downloads: 100,
  average_rating: 4.0,
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  let cleanupNeeded = false;
  let exitCode = 0;

  try {
    const initial = await listGames();
    assert(
      initial.length === 15,
      `Expected 15 games initially, got ${initial.length}`,
    );
    console.log('listGames: 15 games OK');

    const known = await getGameById('hollow-knight');
    assert(
      known !== null && known.title === 'Hollow Knight',
      'Expected hollow-knight to exist with title "Hollow Knight"',
    );
    console.log('getGameById(known): OK');

    const missing = await getGameById('does-not-exist');
    assert(missing === null, `Expected null for missing id, got ${missing}`);
    console.log('getGameById(missing): null OK');

    cleanupNeeded = true;
    const created = await createGame(TEST_INPUT);
    assert(
      created.id === TEST_ID,
      `Expected id "${TEST_ID}", got "${created.id}"`,
    );
    console.log(`createGame: id=${TEST_ID} OK`);

    const afterCreate = await listGames();
    assert(
      afterCreate.length === 16,
      `Expected 16 games after create, got ${afterCreate.length}`,
    );
    console.log('createGame persisted: 16 games OK');

    const updated = await updateGame(TEST_ID, { average_rating: 4.5 });
    assert(
      updated !== null && updated.average_rating === 4.5,
      `Expected updated rating 4.5, got ${updated?.average_rating}`,
    );
    console.log('updateGame: rating=4.5 OK');

    const fetched = await getGameById(TEST_ID);
    assert(
      fetched !== null && fetched.average_rating === 4.5,
      `Expected persisted rating 4.5, got ${fetched?.average_rating}`,
    );
    console.log('updateGame persisted: rating=4.5 OK');

    const deleted = await deleteGame(TEST_ID);
    assert(deleted === true, `Expected delete to return true, got ${deleted}`);
    cleanupNeeded = false;
    console.log('deleteGame: true OK');

    const final = await listGames();
    assert(
      final.length === 15,
      `Expected 15 games after delete, got ${final.length}`,
    );
    console.log('deleteGame persisted: 15 games OK');
  } catch (err) {
    const e = err as Error;
    console.error(`SMOKE TEST FAILED: ${e.message}`);
    if (e.stack) {
      console.error(e.stack);
    }
    exitCode = 1;
  } finally {
    if (cleanupNeeded) {
      try {
        const removed = await deleteGame(TEST_ID);
        if (removed) {
          console.error(`Cleanup: removed leftover ${TEST_ID} after failure`);
        }
      } catch (cleanupErr) {
        console.error(
          `Cleanup failed: ${(cleanupErr as Error).message}`,
        );
      }
    }
  }

  process.exit(exitCode);
}

main();
