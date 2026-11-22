import 'server-only';
import { GamesRepository } from '@/lib/repositories/games-repository';
import {
  createGameSchema,
  updateGameSchema,
  gameFilterSchema,
  type Game,
  type CreateGameInput,
  type UpdateGameInput,
  type GameFilter,
  type CatalogStats,
} from '@/lib/types';
import { z } from 'zod';

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: z.ZodIssue[]; notFound?: boolean };

/**
 * GamesService encapsulates domain business logic and validation for the indie games catalog.
 * It is invoked by both Next.js REST API route handlers and AI function-calling tools.
 */
export class GamesService {
  private repository: GamesRepository;

  constructor(customRepo?: GamesRepository) {
    this.repository = customRepo || new GamesRepository();
  }

  /**
   * Lists games according to validated filter, search, sort, and pagination criteria.
   */
  listGames(rawFilter: unknown = {}): ServiceResult<{ games: Game[]; total: number }> {
    const parseResult = gameFilterSchema.safeParse(rawFilter);
    if (!parseResult.success) {
      return {
        success: false,
        error: 'Invalid query filters',
        details: parseResult.error.issues,
      };
    }

    const filter = parseResult.data;
    const games = this.repository.findAll(filter);
    const total = this.repository.count({
      genre: filter.genre,
      rating_above: filter.rating_above,
      min_rating: filter.min_rating,
      max_rating: filter.max_rating,
      min_revenue: filter.min_revenue,
    });

    return {
      success: true,
      data: { games, total },
    };
  }

  /**
   * Retrieves a single game by its unique ID.
   */
  getGameById(id: string): ServiceResult<Game> {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Valid game ID is required' };
    }

    const game = this.repository.findById(id.trim());
    if (!game) {
      return { success: false, error: `Game not found with ID: ${id}`, notFound: true };
    }

    return { success: true, data: game };
  }

  /**
   * Creates a new game record with domain validation across all six required fields.
   */
  createGame(rawInput: unknown): ServiceResult<Game> {
    const parseResult = createGameSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error: 'Validation failed for create game',
        details: parseResult.error.issues,
      };
    }

    const input: CreateGameInput = parseResult.data;

    // Check for duplicate title
    const existing = this.repository.findByTitle(input.title);
    if (existing) {
      return {
        success: false,
        error: `A game with the title "${input.title}" already exists in the catalog`,
      };
    }

    const created = this.repository.create(input);
    return { success: true, data: created };
  }

  /**
   * Updates an existing game record partially with validation.
   */
  updateGame(id: string, rawInput: unknown): ServiceResult<Game> {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Valid game ID is required' };
    }

    const existing = this.repository.findById(id.trim());
    if (!existing) {
      return { success: false, error: `Game not found with ID: ${id}`, notFound: true };
    }

    const parseResult = updateGameSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error: 'Validation failed for update game',
        details: parseResult.error.issues,
      };
    }

    const input: UpdateGameInput = parseResult.data;

    // If title changed, verify uniqueness
    if (input.title && input.title.toLowerCase() !== existing.title.toLowerCase()) {
      const duplicate = this.repository.findByTitle(input.title);
      if (duplicate && duplicate.id !== existing.id) {
        return {
          success: false,
          error: `A game with the title "${input.title}" already exists in the catalog`,
        };
      }
    }

    const updated = this.repository.update(existing.id, input);
    if (!updated) {
      return { success: false, error: 'Failed to apply update', notFound: true };
    }

    return { success: true, data: updated };
  }

  /**
   * Deletes a game by ID.
   */
  deleteGame(id: string): ServiceResult<{ id: string; deleted: boolean }> {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Valid game ID is required' };
    }

    const existing = this.repository.findById(id.trim());
    if (!existing) {
      return { success: false, error: `Game not found with ID: ${id}`, notFound: true };
    }

    const deleted = this.repository.delete(existing.id);
    return { success: true, data: { id: existing.id, deleted } };
  }

  /**
   * Specialized search method for AI tools.
   */
  searchGames(params: {
    query?: string;
    genre?: string;
    rating_above?: number;
    min_rating?: number;
    max_rating?: number;
    min_revenue?: number;
    limit?: number;
  }): Game[] {
    const filter: GameFilter = {
      search: params.query,
      genre: params.genre,
      rating_above: params.rating_above,
      min_rating: params.min_rating,
      max_rating: params.max_rating,
      min_revenue: params.min_revenue,
      limit: params.limit || 10,
    };
    return this.repository.findAll(filter);
  }

  /**
   * Specialized count method for AI tools.
   * Crucial for question: "How many games are rated above 4?" (uses strict rating_above > 4.0).
   */
  countGames(params: {
    genre?: string;
    rating_above?: number;
    min_rating?: number;
    max_rating?: number;
    min_revenue?: number;
  }): { count: number } {
    const count = this.repository.count(params);
    return { count };
  }

  /**
   * Specialized ranking method for AI tools.
   * Note: monthly_revenue_usd reflects recorded catalog numbers without calendar month timestamps.
   */
  getTopGames(params: {
    metric: 'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating';
    order?: 'asc' | 'desc';
    limit?: number;
  }): Game[] {
    return this.repository.getTop(params.metric, params.order || 'desc', params.limit || 5);
  }

  /**
   * Specialized comparison method for AI tools.
   * Compares 2 or more games side-by-side with metric deltas.
   */
  compareGames(titlesOrIds: string[]): {
    games: Game[];
    revenue_delta_usd?: number;
    downloads_delta?: number;
    rating_delta?: number;
  } {
    const games = this.repository.compare(titlesOrIds);
    if (games.length < 2) {
      return { games };
    }

    const first = games[0];
    const second = games[1];

    return {
      games,
      revenue_delta_usd: Number((first.monthly_revenue_usd - second.monthly_revenue_usd).toFixed(2)),
      downloads_delta: first.monthly_downloads - second.monthly_downloads,
      rating_delta: Number((first.average_rating - second.average_rating).toFixed(2)),
    };
  }

  /**
   * Catalog overview stats for dashboard cards and AI questions.
   */
  getCatalogStats(): CatalogStats {
    return this.repository.getStats();
  }
}

let defaultServiceInstance: GamesService | null = null;

export function getGamesService(): GamesService {
  if (!defaultServiceInstance) {
    defaultServiceInstance = new GamesService();
  }
  return defaultServiceInstance;
}
