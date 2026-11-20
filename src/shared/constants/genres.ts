export const GENRES = [
  'Action',
  'Adventure',
  'Horror',
  'Metroidvania',
  'Platformer',
  'Puzzle',
  'Roguelike',
  'RPG',
  'Simulation',
  'Strategy',
] as const;

export type Genre = (typeof GENRES)[number];
