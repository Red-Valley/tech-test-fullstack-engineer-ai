import { z } from 'zod';

export const GameSchema = z.object({
    id: z.number().int().positive(),
    title: z.string().trim().min(1, 'Title is required').max(120),
    developer: z.string().trim().min(1, 'Developer is required').max(120),
    genre: z.string().trim().min(1, 'Genre is required').max(60),
    description: z
        .string()
        .trim()
        .max(1000, 'Description must be 1000 characters or fewer')
        .default(''),
    monthly_revenue_usd: z.coerce.number().finite().min(0, 'Monthly revenue must be 0 or greater'),
    monthly_downloads: z.coerce
        .number()
        .int('Monthly downloads must be an integer')
        .min(0, 'Monthly downloads must be 0 or greater'),
    average_rating: z.coerce
        .number()
        .finite()
        .min(0, 'Rating must be between 0 and 5')
        .max(5, 'Rating must be between 0 and 5'),
    created_at: z.string(),
    updated_at: z.string(),
});

export const CreateGameSchema = GameSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
});

export const UpdateGameSchema = CreateGameSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' },
);

export type Game = z.infer<typeof GameSchema>;
export type CreateGameInput = z.input<typeof CreateGameSchema>;
export type UpdateGameInput = z.input<typeof UpdateGameSchema>;

export interface GameListFilter {
    search?: string;
    genre?: string;
    minRating?: number;
    maxRating?: number;
    sortBy?:
        | 'title'
        | 'developer'
        | 'genre'
        | 'monthly_revenue_usd'
        | 'monthly_downloads'
        | 'average_rating'
        | 'updated_at';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
}

export interface CatalogStats {
    total_games: number;
    total_monthly_revenue_usd: number;
    total_monthly_downloads: number;
    average_rating: number;
    highest_revenue_game: Game | null;
    highest_rated_game: Game | null;
    genres: Array<{
        genre: string;
        count: number;
        total_revenue_usd: number;
        total_downloads: number;
        avg_rating: number;
    }>;
}

export type ChatStreamEvent =
    | { type: 'tool_start'; id: string; name: string; input: unknown }
    | { type: 'tool_end'; id: string; name: string; output: string }
    | { type: 'token'; content: string }
    | { type: 'done'; model: string }
    | { type: 'error'; message: string };
