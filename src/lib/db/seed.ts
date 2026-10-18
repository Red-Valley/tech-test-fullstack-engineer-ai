import type { GameInput } from "./schema";

/** Fictional catalog inserted once, when the database file is first created. */
export const SEED_GAMES: GameInput[] = [
  { title: "Hollow Depths", developer: "Mossgrove Studio", genre: "Metroidvania", monthly_revenue_usd: 142500, monthly_downloads: 38200, average_rating: 4.7 },
  { title: "Stardust Farm", developer: "Pixel Hearth", genre: "Farming Sim", monthly_revenue_usd: 98000, monthly_downloads: 51400, average_rating: 4.5 },
  { title: "Neon Drift", developer: "Volt Circuit", genre: "Racing", monthly_revenue_usd: 61200, monthly_downloads: 29800, average_rating: 3.9 },
  { title: "Paper Kingdoms", developer: "Foldline Games", genre: "Strategy", monthly_revenue_usd: 45300, monthly_downloads: 12600, average_rating: 4.2 },
  { title: "Cinder & Salt", developer: "Two Lanterns", genre: "Narrative", monthly_revenue_usd: 22800, monthly_downloads: 9100, average_rating: 4.8 },
  { title: "Rogue Harvest", developer: "Mossgrove Studio", genre: "Roguelike", monthly_revenue_usd: 77900, monthly_downloads: 33700, average_rating: 4.1 },
  { title: "Deep Signal", developer: "Hexwave", genre: "Horror", monthly_revenue_usd: 54600, monthly_downloads: 21300, average_rating: 3.6 },
  { title: "Tidewalkers", developer: "Pixel Hearth", genre: "Adventure", monthly_revenue_usd: 19400, monthly_downloads: 8750, average_rating: 3.8 },
  { title: "Gearloose", developer: "Brass Rabbit", genre: "Puzzle", monthly_revenue_usd: 31250, monthly_downloads: 17900, average_rating: 4.4 },
  { title: "Skyline Siege", developer: "Volt Circuit", genre: "Tower Defense", monthly_revenue_usd: 12900, monthly_downloads: 6300, average_rating: 3.2 },
  { title: "Moth & Lantern", developer: "Two Lanterns", genre: "Platformer", monthly_revenue_usd: 8400, monthly_downloads: 4900, average_rating: 4.0 },
  { title: "Ironvale Tactics", developer: "Foldline Games", genre: "Tactics", monthly_revenue_usd: 36700, monthly_downloads: 10200, average_rating: 4.3 },
];
