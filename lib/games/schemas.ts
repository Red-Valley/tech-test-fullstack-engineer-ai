import { z } from "zod";

export const gameInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  developer: z.string().trim().min(1).max(200),
  genre: z.string().trim().min(1).max(100),
  monthly_revenue_usd: z.number().finite().nonnegative(),
  monthly_downloads: z.number().int().nonnegative(),
  average_rating: z.number().min(0).max(5),
});

export const gameUpdateSchema = gameInputSchema;
