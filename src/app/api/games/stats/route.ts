import 'server-only';
import { NextResponse } from 'next/server';
import { getGamesService } from '@/lib/services/games-service';

export const runtime = 'nodejs';

/**
 * GET /api/games/stats
 * Read-only endpoint returning accurate catalog-wide KPI statistics and genre breakdown.
 */
export async function GET() {
  try {
    const service = getGamesService();
    const stats = service.getCatalogStats();
    const topEarner = service.getTopGames({ metric: 'monthly_revenue_usd', limit: 1 })[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        total_games: stats.total_games,
        total_monthly_revenue_usd: stats.total_monthly_revenue_usd,
        average_monthly_downloads: stats.average_monthly_downloads,
        average_rating: stats.average_rating,
        top_earner: topEarner
          ? {
              id: topEarner.id,
              title: topEarner.title,
              developer: topEarner.developer,
              monthly_revenue_usd: topEarner.monthly_revenue_usd,
            }
          : null,
        genre_breakdown: stats.genre_breakdown,
      },
    });
  } catch (error) {
    console.error('GET /api/games/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching catalog stats' },
      { status: 500 }
    );
  }
}
