import type { GameInput } from './types';

// Fictional catalog shaped for the sample chat questions: a clear revenue leader
// (Starfall Tactics), exactly five games rated above 4, one game at exactly 4.0 to
// expose the exclusive boundary, and two easy-to-compare names (the two Circuits).
export const SEED_GAMES: readonly GameInput[] = [
  { title: 'Starfall Tactics', developer: 'Nimbus Forge', genre: 'Strategy', monthly_revenue_usd: 312400, monthly_downloads: 48210, average_rating: 4.7 },
  { title: 'Hollow Lantern', developer: 'Duskwright Games', genre: 'Metroidvania', monthly_revenue_usd: 148900.75, monthly_downloads: 36120, average_rating: 4.8 },
  { title: 'Moss & Marrow', developer: 'Bramble Byte', genre: 'Roguelike', monthly_revenue_usd: 96250, monthly_downloads: 28740, average_rating: 4.3 },
  { title: 'Turnip Almanac', developer: 'Sunny Acre Studio', genre: 'Farming Sim', monthly_revenue_usd: 88400.5, monthly_downloads: 51200, average_rating: 4.5 },
  { title: 'Crimson Circuit', developer: 'Redline Collective', genre: 'Racing', monthly_revenue_usd: 64300, monthly_downloads: 24890, average_rating: 3.9 },
  { title: 'Cobalt Circuit', developer: 'Redline Collective', genre: 'Racing', monthly_revenue_usd: 61750, monthly_downloads: 26015, average_rating: 3.7 },
  { title: 'Clockwork Burrow', developer: 'Tin Rabbit', genre: 'Puzzle', monthly_revenue_usd: 41200, monthly_downloads: 19800, average_rating: 4 },
  { title: 'Whispering Pines', developer: 'Grey Attic', genre: 'Horror', monthly_revenue_usd: 37850.25, monthly_downloads: 12640, average_rating: 3.8 },
  { title: 'Gravel & Gears', developer: 'Tin Rabbit', genre: 'Platformer', monthly_revenue_usd: 29400, monthly_downloads: 17950, average_rating: 3.6 },
  { title: 'Cinder Dungeon', developer: 'Bramble Byte', genre: 'Roguelike', monthly_revenue_usd: 22100, monthly_downloads: 15330, average_rating: 3.5 },
  { title: 'Tiny Tidepools', developer: 'Saltwater Pixel', genre: 'Puzzle', monthly_revenue_usd: 18900, monthly_downloads: 22310, average_rating: 4.2 },
  { title: 'Sunpetal Valley', developer: 'Sunny Acre Studio', genre: 'Farming Sim', monthly_revenue_usd: 15480, monthly_downloads: 13020, average_rating: 3.2 },
  { title: 'Paper Comets', developer: 'Origami Engine', genre: 'Platformer', monthly_revenue_usd: 12750, monthly_downloads: 9480, average_rating: 3.4 },
  { title: 'The Last Ferryman', developer: 'Grey Attic', genre: 'Horror', monthly_revenue_usd: 9600, monthly_downloads: 4210, average_rating: 3.9 },
];
