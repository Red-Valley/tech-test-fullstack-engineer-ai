export type Game = {
  id: string;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
};

export type NewGame = Omit<Game, "id" | "created_at" | "updated_at">;

export type GameUpdate = NewGame;
