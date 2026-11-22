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
  // More games: a larger catalog for the dashboard and for chat questions that need filtering and ranking.
  // Platformer
  { title: "Skyhook Sam", developer: "Gullwing Games", genre: "Platformer", monthly_revenue_usd: 22400, monthly_downloads: 88000, average_rating: 4.2 },
  { title: "Pocket Comet", developer: "Paperkite Games", genre: "Platformer", monthly_revenue_usd: 9850.75, monthly_downloads: 134000, average_rating: 3.5 },
  { title: "Marrow & Moss", developer: "Mossbark Studio", genre: "Platformer", monthly_revenue_usd: 17300, monthly_downloads: 52000, average_rating: 4.4 },
  { title: "Lamplight Leap", developer: "Cinderlight Games", genre: "Platformer", monthly_revenue_usd: 35900, monthly_downloads: 121000, average_rating: 3.9 },
  // Roguelike
  { title: "Bonepile Descent", developer: "Nightjar Works", genre: "Roguelike", monthly_revenue_usd: 28150, monthly_downloads: 97000, average_rating: 4.0 },
  { title: "Gutterlight", developer: "Starling Forge", genre: "Roguelike", monthly_revenue_usd: 11600, monthly_downloads: 36000, average_rating: 3.3 },
  { title: "Sundial Sprawl", developer: "Tinderbox Labs", genre: "Roguelike", monthly_revenue_usd: 61200, monthly_downloads: 240000, average_rating: 4.6 },
  { title: "Tarnished Choir", developer: "Saltmarsh Interactive", genre: "Roguelike", monthly_revenue_usd: 7450, monthly_downloads: 23000, average_rating: 2.8 },
  // Puzzle
  { title: "Glyphwright", developer: "Quartzfox Games", genre: "Puzzle", monthly_revenue_usd: 14980, monthly_downloads: 61000, average_rating: 4.5 },
  { title: "Folded Hours", developer: "Paperkite Games", genre: "Puzzle", monthly_revenue_usd: 8700, monthly_downloads: 44000, average_rating: 4.7 },
  { title: "Cobble & Clock", developer: "Copperleaf Interactive", genre: "Puzzle", monthly_revenue_usd: 5320, monthly_downloads: 29000, average_rating: 3.6 },
  { title: "Lantern Maze Co.", developer: "Brightpaw Games", genre: "Puzzle", monthly_revenue_usd: 2150.4, monthly_downloads: 18500, average_rating: 3.1 },
  // Strategy
  { title: "Granary Wars", developer: "Ironbloom Studio", genre: "Strategy", monthly_revenue_usd: 43700, monthly_downloads: 76000, average_rating: 4.3 },
  { title: "Tidewall Protocol", developer: "Starling Forge", genre: "Strategy", monthly_revenue_usd: 56300, monthly_downloads: 92000, average_rating: 4.1 },
  { title: "Redoubt Nine", developer: "Quillfire Works", genre: "Strategy", monthly_revenue_usd: 19400, monthly_downloads: 31000, average_rating: 3.8 },
  { title: "Caravan Ledger", developer: "Driftwood Digital", genre: "Strategy", monthly_revenue_usd: 12250, monthly_downloads: 27000, average_rating: 3.4 },
  // Simulation
  { title: "Quiet Observatory", developer: "Fernwhistle Studio", genre: "Simulation", monthly_revenue_usd: 24600, monthly_downloads: 83000, average_rating: 4.6 },
  { title: "Tinker Town Transit", developer: "Halcyon Pixel", genre: "Simulation", monthly_revenue_usd: 31400, monthly_downloads: 148000, average_rating: 3.7 },
  { title: "Pondkeeper", developer: "Lanternfish Collective", genre: "Simulation", monthly_revenue_usd: 16850, monthly_downloads: 112000, average_rating: 4.4 },
  { title: "Night Market Manager", developer: "Wrenfall Interactive", genre: "Simulation", monthly_revenue_usd: 6990, monthly_downloads: 33000, average_rating: 3.2 },
  // Narrative
  { title: "The Salt Cartographer", developer: "Lowtide Narrative", genre: "Narrative", monthly_revenue_usd: 11200, monthly_downloads: 26000, average_rating: 4.8 },
  { title: "Postcards from Nowhere Station", developer: "Wrenfall Interactive", genre: "Narrative", monthly_revenue_usd: 4380, monthly_downloads: 15000, average_rating: 4.1 },
  { title: "Ninth Floor Lullaby", developer: "Nightjar Works", genre: "Narrative", monthly_revenue_usd: 9150, monthly_downloads: 41000, average_rating: 3.9 },
  { title: "Rust Orchard", developer: "Mossbark Studio", genre: "Narrative", monthly_revenue_usd: 3260, monthly_downloads: 12500, average_rating: 3.4 },
  // Metroidvania
  { title: "Cinder Choir", developer: "Cinderlight Games", genre: "Metroidvania", monthly_revenue_usd: 47500, monthly_downloads: 156000, average_rating: 4.5 },
  { title: "Underbloom", developer: "Mossbark Studio", genre: "Metroidvania", monthly_revenue_usd: 38800, monthly_downloads: 118000, average_rating: 4.3 },
  { title: "Wyrmglass", developer: "Ironbloom Studio", genre: "Metroidvania", monthly_revenue_usd: 21350, monthly_downloads: 69000, average_rating: 3.8 },
  { title: "Brinegate", developer: "Saltmarsh Interactive", genre: "Metroidvania", monthly_revenue_usd: 13700, monthly_downloads: 47000, average_rating: 3.5 },
  // Tower Defense
  { title: "Hedgerow Siege", developer: "Tinderbox Labs", genre: "Tower Defense", monthly_revenue_usd: 26900, monthly_downloads: 164000, average_rating: 4.0 },
  { title: "Pylon & Pine", developer: "Quartzfox Games", genre: "Tower Defense", monthly_revenue_usd: 15420, monthly_downloads: 73000, average_rating: 3.7 },
  { title: "Moatkeepers", developer: "Gullwing Games", genre: "Tower Defense", monthly_revenue_usd: 8260, monthly_downloads: 52000, average_rating: 3.0 },
  { title: "Beacon Brigade", developer: "Halcyon Pixel", genre: "Tower Defense", monthly_revenue_usd: 33250, monthly_downloads: 131000, average_rating: 4.2 },
  // Racing
  { title: "Gravel Saints", developer: "Driftwood Digital", genre: "Racing", monthly_revenue_usd: 52900, monthly_downloads: 285000, average_rating: 4.4 },
  { title: "Kite Circuit", developer: "Paperkite Games", genre: "Racing", monthly_revenue_usd: 18700, monthly_downloads: 99000, average_rating: 3.9 },
  { title: "Rainline Rally", developer: "Copperleaf Interactive", genre: "Racing", monthly_revenue_usd: 12880, monthly_downloads: 58000, average_rating: 3.6 },
  { title: "Tundra Dash 88", developer: "Brightpaw Games", genre: "Racing", monthly_revenue_usd: 5940, monthly_downloads: 71000, average_rating: 2.9 },
  // Deckbuilder
  { title: "Thistle & Thorn", developer: "Lanternfish Collective", genre: "Deckbuilder", monthly_revenue_usd: 41300, monthly_downloads: 126000, average_rating: 4.7 },
  { title: "Cardwright's Gambit", developer: "Quillfire Works", genre: "Deckbuilder", monthly_revenue_usd: 29550, monthly_downloads: 88500, average_rating: 4.1 },
  { title: "Ashfall Tarot", developer: "Nightjar Works", genre: "Deckbuilder", monthly_revenue_usd: 17950, monthly_downloads: 54000, average_rating: 4.3 },
  { title: "Bargain Bin Brawl", developer: "Fernwhistle Studio", genre: "Deckbuilder", monthly_revenue_usd: 6120, monthly_downloads: 38000, average_rating: 3.3 },
  // Horror
  { title: "Lowlight Lodge", developer: "Wrenfall Interactive", genre: "Horror", monthly_revenue_usd: 36800, monthly_downloads: 142000, average_rating: 4.2 },
  { title: "Static Between Stations", developer: "Nightjar Works", genre: "Horror", monthly_revenue_usd: 22640, monthly_downloads: 77000, average_rating: 4.5 },
  { title: "The Quiet Pantry", developer: "Tinderbox Labs", genre: "Horror", monthly_revenue_usd: 14300, monthly_downloads: 66000, average_rating: 3.6 },
  { title: "Hollowmere", developer: "Ironbloom Studio", genre: "Horror", monthly_revenue_usd: 9380, monthly_downloads: 30000, average_rating: 3.1 },
  // Rhythm
  { title: "Metronome Moths", developer: "Halcyon Pixel", genre: "Rhythm", monthly_revenue_usd: 20100, monthly_downloads: 103000, average_rating: 4.4 },
  { title: "Bassline Bakery", developer: "Gullwing Games", genre: "Rhythm", monthly_revenue_usd: 11750, monthly_downloads: 82000, average_rating: 3.8 },
  { title: "Tapdance Typhoon", developer: "Paperkite Games", genre: "Rhythm", monthly_revenue_usd: 7580, monthly_downloads: 64000, average_rating: 3.4 },
  { title: "Vinyl Lighthouse", developer: "Lanternfish Collective", genre: "Rhythm", monthly_revenue_usd: 3940, monthly_downloads: 19000, average_rating: 4.0 },
  // Sandbox
  { title: "Driftwood Dominion", developer: "Driftwood Digital", genre: "Sandbox", monthly_revenue_usd: 64800, monthly_downloads: 310000, average_rating: 4.5 },
  { title: "Clay & Cloud", developer: "Copperleaf Interactive", genre: "Sandbox", monthly_revenue_usd: 27300, monthly_downloads: 142000, average_rating: 4.2 },
  { title: "Tinkerhaven", developer: "Mossbark Studio", genre: "Sandbox", monthly_revenue_usd: 16150, monthly_downloads: 90000, average_rating: 3.7 },
  { title: "Pocket Archipelago", developer: "Quartzfox Games", genre: "Sandbox", monthly_revenue_usd: 8840, monthly_downloads: 74000, average_rating: 3.3 },
];
