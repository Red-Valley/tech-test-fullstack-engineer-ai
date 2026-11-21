import type { GameInput } from "./schema";

/**
 * Fictional indie games used to seed an empty database. All titles and
 * developers are invented. Figures are last month's numbers.
 */
export const SEED_GAMES: GameInput[] = [
  // Platformer
  { title: "Ember Reach", developer: "Cinderlight Games", genre: "Platformer", monthly_revenue_usd: 48200, monthly_downloads: 182000, average_rating: 4.6 },
  { title: "Neon Kettle", developer: "Brightpaw Games", genre: "Platformer", monthly_revenue_usd: 6200.5, monthly_downloads: 71000, average_rating: 3.2 },
  { title: "Cloudstep Chronicles", developer: "Quillfire Works", genre: "Platformer", monthly_revenue_usd: 31750, monthly_downloads: 94000, average_rating: 3.7 },
  // Roguelike
  { title: "Tidebreaker", developer: "Saltmarsh Interactive", genre: "Roguelike", monthly_revenue_usd: 91500, monthly_downloads: 310000, average_rating: 4.4 },
  { title: "Hollow Lantern", developer: "Cinderlight Games", genre: "Roguelike", monthly_revenue_usd: 53400, monthly_downloads: 205000, average_rating: 4.1 },
  { title: "Ashen Delve", developer: "Starling Forge", genre: "Roguelike", monthly_revenue_usd: 14200, monthly_downloads: 58000, average_rating: 2.9 },
  // Puzzle
  { title: "Moss & Mirrors", developer: "Fernwhistle Studio", genre: "Puzzle", monthly_revenue_usd: 12400, monthly_downloads: 64000, average_rating: 4.8 },
  { title: "Gearwright", developer: "Starling Forge", genre: "Puzzle", monthly_revenue_usd: 21100, monthly_downloads: 87000, average_rating: 4.2 },
  { title: "Knotwork", developer: "Brightpaw Games", genre: "Puzzle", monthly_revenue_usd: 3900, monthly_downloads: 41000, average_rating: 3.8 },
  // Strategy
  { title: "Paper Citadel", developer: "Quillfire Works", genre: "Strategy", monthly_revenue_usd: 27800, monthly_downloads: 45000, average_rating: 3.9 },
  { title: "Cobalt Orbit", developer: "Starling Forge", genre: "Strategy", monthly_revenue_usd: 74600, monthly_downloads: 128000, average_rating: 4.5 },
  { title: "Frostline Command", developer: "Quillfire Works", genre: "Strategy", monthly_revenue_usd: 9700, monthly_downloads: 18000, average_rating: 3.1 },
  // Simulation
  { title: "Quiet Orchard", developer: "Fernwhistle Studio", genre: "Simulation", monthly_revenue_usd: 18900, monthly_downloads: 98000, average_rating: 4.7 },
  { title: "Pebble Pals", developer: "Brightpaw Games", genre: "Simulation", monthly_revenue_usd: 9300, monthly_downloads: 156000, average_rating: 3.4 },
  { title: "Harbor Lights Bakery", developer: "Saltmarsh Interactive", genre: "Simulation", monthly_revenue_usd: 38200, monthly_downloads: 142000, average_rating: 4.0 },
  // Narrative
  { title: "Whispering Pines", developer: "Lowtide Narrative", genre: "Narrative", monthly_revenue_usd: 15600, monthly_downloads: 39000, average_rating: 4.9 },
  { title: "Last Ferry to Alder", developer: "Lowtide Narrative", genre: "Narrative", monthly_revenue_usd: 8800, monthly_downloads: 22000, average_rating: 4.3 },
  { title: "Salt Letters", developer: "Lowtide Narrative", genre: "Narrative", monthly_revenue_usd: 5100, monthly_downloads: 17000, average_rating: 3.6 },
];
