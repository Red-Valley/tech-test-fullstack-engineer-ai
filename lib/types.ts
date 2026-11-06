export interface Game {
  id: number;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number; // >= 0, USD del último mes
  monthly_downloads: number; // entero >= 0
  average_rating: number; // 0.0 – 5.0
  created_at: string; // ISO
  updated_at: string; // ISO
}

export type GameInput = Omit<Game, 'id' | 'created_at' | 'updated_at'>;
