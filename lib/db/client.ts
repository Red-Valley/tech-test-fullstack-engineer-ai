import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "games.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");

function createClient(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
  return db;
}

let client: Database.Database | undefined;

export function getDb(): Database.Database {
  if (!client) {
    client = createClient();
  }
  return client;
}
