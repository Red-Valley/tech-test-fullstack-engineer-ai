// Deletes the local SQLite database so the next start re-creates and re-seeds it.
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const dbPath = resolve(process.cwd(), process.env.DATABASE_PATH ?? "data/games.db");

for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  rmSync(file, { force: true });
}

console.log(`Removed ${dbPath}. It will be re-created and re-seeded on the next start.`);
