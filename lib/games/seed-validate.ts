import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gameSchema, type Game } from './schema';

const GAMES_PATH = resolve(process.cwd(), 'data/games.json');

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(GAMES_PATH, 'utf-8');
  } catch (err) {
    console.error(`Failed to read ${GAMES_PATH}: ${(err as Error).message}`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Invalid JSON in ${GAMES_PATH}: ${(err as Error).message}`);
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error(`Expected JSON array at root of ${GAMES_PATH}`);
    process.exit(1);
  }

  const errors: string[] = [];
  const games: Game[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const entry: unknown = parsed[i];
    const result = gameSchema.safeParse(entry);
    if (!result.success) {
      const title = extractTitle(entry, i);
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ');
      errors.push(`${title}: ${issues}`);
    } else {
      games.push(result.data);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(e);
    }
    process.exit(1);
  }

  if (games.length !== 15) {
    console.error(`Expected 15 games, got ${games.length}`);
    process.exit(1);
  }

  const genres = new Set(games.map((g) => g.genre));
  const ratings = games.map((g) => g.average_rating);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const above45 = ratings.filter((r) => r > 4.5).length;
  const below40 = ratings.filter((r) => r < 4.0).length;
  const revenues = games.map((g) => g.monthly_revenue_usd);
  const minRevenue = Math.min(...revenues);
  const maxRevenue = Math.max(...revenues);

  if (genres.size < 6) {
    console.error(`Expected at least 6 distinct genres, got ${genres.size}`);
    process.exit(1);
  }
  if (minRating < 3.2 || maxRating > 4.9) {
    console.error(
      `Ratings must be within [3.2, 4.9], got [${minRating}, ${maxRating}]`,
    );
    process.exit(1);
  }
  if (above45 < 4) {
    console.error(`Expected at least 4 ratings above 4.5, got ${above45}`);
    process.exit(1);
  }
  if (below40 < 2) {
    console.error(`Expected at least 2 ratings below 4.0, got ${below40}`);
    process.exit(1);
  }
  if (minRevenue < 5_000 || maxRevenue > 500_000) {
    console.error(
      `Revenue must be within [$5,000, $500,000], got [$${minRevenue}, $${maxRevenue}]`,
    );
    process.exit(1);
  }

  console.log(
    `Validated ${games.length} games across ${genres.size} genres; rating range [${minRating}, ${maxRating}]; revenue range [$${minRevenue}, $${maxRevenue}].`,
  );
  process.exit(0);
}

function extractTitle(entry: unknown, fallbackIndex: number): string {
  if (
    entry !== null &&
    typeof entry === 'object' &&
    'title' in entry &&
    typeof (entry as { title: unknown }).title === 'string'
  ) {
    return (entry as { title: string }).title;
  }
  return `<index ${fallbackIndex}>`;
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
