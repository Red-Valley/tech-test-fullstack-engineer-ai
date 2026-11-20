import type { GameInput } from "./schema";

/**
 * Sample catalog inserted once, when the database file is first created.
 * Every title, studio and figure is fictional - made up for the demo, not real market data.
 *
 * Deliberate edge cases for the chat: a clear revenue leader, several games rated exactly 4.0
 * (so "above 4" must be a strict comparison), and similar titles for name resolution.
 */
export const SEED_GAMES: GameInput[] = [
  { title: "Lanternfall", developer: "Mossy Pixel Studio", genre: "Platformer", monthly_revenue_usd: 84200.5, monthly_downloads: 120400, average_rating: 4.6 },
  { title: "Quiet Orchard", developer: "Hollow Hand Games", genre: "Horror", monthly_revenue_usd: 61300, monthly_downloads: 98250, average_rating: 4.4 },
  { title: "Starlit Courier", developer: "Tiny Comet", genre: "Adventure", monthly_revenue_usd: 47850.75, monthly_downloads: 150300, average_rating: 4.2 },
  { title: "Brick & Mortar Tycoon", developer: "Gridlock Labs", genre: "Simulation", monthly_revenue_usd: 132400, monthly_downloads: 210000, average_rating: 4.0 },
  { title: "Rune Cartographer", developer: "Paper Dragon Co.", genre: "RPG", monthly_revenue_usd: 98750.25, monthly_downloads: 87300, average_rating: 4.7 },
  { title: "Neon Alley Racers", developer: "Slipstream Works", genre: "Racing", monthly_revenue_usd: 39500, monthly_downloads: 305000, average_rating: 3.8 },
  { title: "Spellbound Deck", developer: "Ember & Ink", genre: "Card Game", monthly_revenue_usd: 156900, monthly_downloads: 420000, average_rating: 4.5 },
  { title: "Tidebound", developer: "Saltwind Collective", genre: "Roguelike", monthly_revenue_usd: 72600.4, monthly_downloads: 143500, average_rating: 4.8 },
  { title: "Clockwork Cafe", developer: "Gridlock Labs", genre: "Simulation", monthly_revenue_usd: 28450, monthly_downloads: 64800, average_rating: 4.1 },
  { title: "Echoes of Halcyon", developer: "Paper Dragon Co.", genre: "RPG", monthly_revenue_usd: 203300, monthly_downloads: 175000, average_rating: 4.9 },
  { title: "Pocket Planets", developer: "Tiny Comet", genre: "Puzzle", monthly_revenue_usd: 18900, monthly_downloads: 512000, average_rating: 3.9 },
  { title: "Glass Garden", developer: "Quiet Pine", genre: "Puzzle", monthly_revenue_usd: 12750.5, monthly_downloads: 41200, average_rating: 4.3 },
  { title: "Fortress of Ash", developer: "Ironbark Interactive", genre: "Strategy", monthly_revenue_usd: 88100, monthly_downloads: 76400, average_rating: 4.2 },
  { title: "Moth & Lantern", developer: "Mossy Pixel Studio", genre: "Adventure", monthly_revenue_usd: 35200, monthly_downloads: 58900, average_rating: 4.0 },
  { title: "Dungeon Postman", developer: "Saltwind Collective", genre: "Roguelike", monthly_revenue_usd: 54300, monthly_downloads: 232000, average_rating: 4.4 },
  { title: "Haunted Laundromat", developer: "Hollow Hand Games", genre: "Horror", monthly_revenue_usd: 22600, monthly_downloads: 71500, average_rating: 3.6 },
  { title: "Skyline Sprint", developer: "Slipstream Works", genre: "Racing", monthly_revenue_usd: 15800, monthly_downloads: 98900, average_rating: 3.4 },
  { title: "Tactician's Gambit", developer: "Ironbark Interactive", genre: "Strategy", monthly_revenue_usd: 119500, monthly_downloads: 134200, average_rating: 4.6 },
  { title: "Pixel Pets Park", developer: "Tiny Comet", genre: "Simulation", monthly_revenue_usd: 9400, monthly_downloads: 188000, average_rating: 3.2 },
  { title: "Nine Lives Noir", developer: "Ember & Ink", genre: "Adventure", monthly_revenue_usd: 41700, monthly_downloads: 52100, average_rating: 4.5 },
  { title: "Cavern Cuts", developer: "Quiet Pine", genre: "Platformer", monthly_revenue_usd: 6200, monthly_downloads: 23400, average_rating: 3.7 },
  { title: "Lost Frequencies", developer: "Hollow Hand Games", genre: "Puzzle", monthly_revenue_usd: 8300, monthly_downloads: 19800, average_rating: 4.0 },
  { title: "Orbital Gardener", developer: "Tiny Comet", genre: "Simulation", monthly_revenue_usd: 31200, monthly_downloads: 92600, average_rating: 4.3 },
  { title: "Siege of Embers", developer: "Ironbark Interactive", genre: "Strategy", monthly_revenue_usd: 66800, monthly_downloads: 61300, average_rating: 3.9 },
];
