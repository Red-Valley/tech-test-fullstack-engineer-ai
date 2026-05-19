import { getDb } from "../lib/db/client";
import { SqliteGamesRepository } from "../lib/games/repository";

const SEED_GAMES = [
  { title: "Hollow Knight", developer: "Team Cherry", genre: "Metroidvania", monthly_revenue_usd: 180000, monthly_downloads: 42000, average_rating: 4.9 },
  { title: "Celeste", developer: "Maddy Makes Games", genre: "Platformer", monthly_revenue_usd: 95000, monthly_downloads: 28000, average_rating: 4.8 },
  { title: "Stardew Valley", developer: "ConcernedApe", genre: "Simulation", monthly_revenue_usd: 520000, monthly_downloads: 95000, average_rating: 4.9 },
  { title: "Hades", developer: "Supergiant Games", genre: "Roguelike", monthly_revenue_usd: 310000, monthly_downloads: 67000, average_rating: 4.8 },
  { title: "Shovel Knight", developer: "Yacht Club Games", genre: "Platformer", monthly_revenue_usd: 58000, monthly_downloads: 18000, average_rating: 4.6 },
  { title: "Undertale", developer: "tobyfox", genre: "RPG", monthly_revenue_usd: 74000, monthly_downloads: 22000, average_rating: 4.7 },
  { title: "Dead Cells", developer: "Motion Twin", genre: "Roguelike", monthly_revenue_usd: 125000, monthly_downloads: 31000, average_rating: 4.5 },
  { title: "Cuphead", developer: "Studio MDHR", genre: "Run and Gun", monthly_revenue_usd: 210000, monthly_downloads: 48000, average_rating: 4.6 },
  { title: "Among Us", developer: "Innersloth", genre: "Social Deduction", monthly_revenue_usd: 890000, monthly_downloads: 210000, average_rating: 3.8 },
  { title: "Vampire Survivors", developer: "poncle", genre: "Roguelike", monthly_revenue_usd: 67000, monthly_downloads: 38000, average_rating: 4.4 },
];

const repo = new SqliteGamesRepository(getDb());
const existing = repo.list();

if (existing.length > 0) {
  console.log(`Database already has ${existing.length} games. Skipping seed.`);
  process.exit(0);
}

for (const game of SEED_GAMES) {
  repo.create(game);
}

console.log(`Seeded ${SEED_GAMES.length} games successfully.`);
