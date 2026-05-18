export interface Game {
  id: number;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number;
  created_at: string;
}

export type GameInput = Omit<Game, "id" | "created_at">;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
