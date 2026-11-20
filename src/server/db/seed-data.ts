import type { GameInputDto } from '@/shared/types/game.dto';

// Invented games for the dashboard (`npm run seed`). Tests and evals use their own fixture
// (tests/fixtures/games.fixture.ts), so this list can change freely. Kept so the chat's
// example questions have one clear answer: Starfall Courier leads revenue, Deepdelve leads
// downloads, and no rating is exactly 4.0 (see tests/unit/datasets.test.ts).
const g = (
  title: string,
  developer: string,
  genre: GameInputDto['genre'],
  monthly_revenue_usd: number,
  monthly_downloads: number,
  average_rating: number,
): GameInputDto => ({
  title,
  developer,
  genre,
  monthly_revenue_usd,
  monthly_downloads,
  average_rating,
});

export const SEED_GAMES: GameInputDto[] = [
  g('Starfall Courier', 'Pale Comet Games', 'Action', 412000, 58200, 4.6),
  g('Mossbound', 'Little Fern Studio', 'Adventure', 96500, 21400, 4.3),
  g('The Quiet Lighthouse', 'Saltmarsh Interactive', 'Horror', 74300, 18900, 3.9),
  g('Rustvein', 'Iron Lantern', 'Metroidvania', 188000, 30500, 4.7),
  g('Pocket Comet', 'Tinysun', 'Platformer', 23800, 41200, 3.6),
  g('Fold & Find', 'Paper Crane Labs', 'Puzzle', 15200, 9700, 4.4),
  g('Deepdelve', 'Hollow Oak', 'Roguelike', 356000, 72900, 4.8),
  g('Ashen Crown', 'Ninefold', 'RPG', 241500, 26300, 4.2),
  g('Orchard Keeper', 'Slow Sunday', 'Simulation', 132700, 47600, 4.1),
  g('Tidewardens', 'Brass Compass', 'Strategy', 87900, 12100, 3.7),
  g('Neon Ricochet', 'Static Bloom', 'Action', 54600, 33800, 3.4),
  g("Wayfarer's Map", 'Dusty Atlas', 'Adventure', 31200, 8800, 3.8),
  g('Hush Hollow', 'Grey Lantern', 'Horror', 12900, 6400, 2.8),
  g('Clockwork Vale', 'Gearbit', 'Metroidvania', 67400, 15700, 3.9),
  g('Skyhop', 'Bouncy Pixel', 'Platformer', 8700, 22500, 3.2),
  g('Lumen Lines', 'Prism Hall', 'Puzzle', 41100, 17300, 4.5),
  g('Gravebloom', 'Thorn & Bell', 'Roguelike', 203400, 39800, 4.4),
  g('Saga of the Salt Kings', 'Northwind', 'RPG', 119800, 14200, 3.9),
  g('Hearth & Harvest', 'Kettle Games', 'Simulation', 76200, 28900, 4.3),
  g('Frontier Ledger', 'Quillwork', 'Strategy', 45300, 7600, 4.6),
  g('Spectral Sprint', 'Wisp Works', 'Action', 19400, 12800, 2.5),
  g('Moonlit Ferry', 'Lowtide', 'Adventure', 6100, 3900, 4.9),
  g('Cinderloop', 'Ember Fox', 'Roguelike', 94100, 25600, 3.5),
  g('Byte Garden', 'Seedling', 'Simulation', 28600, 19100, 3.1),
  g('Signal Lost', 'Fog Machine', 'Horror', 158900, 35200, 4.2),
];
