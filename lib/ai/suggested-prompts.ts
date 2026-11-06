import 'server-only';
import { listGames } from '@/lib/games';
import { gameInputSchema } from '@/lib/schema';

const FALLBACK_COMPARISON = 'Compare revenue of the two top-earning games.';

function getComparisonPrompt(): string {
  try {
    const [first, second] = listGames({ sortBy: 'monthly_revenue_usd', order: 'desc', limit: 2 });
    return first && second ? `Compare revenue of ${first.title} vs ${second.title}.` : FALLBACK_COMPARISON;
  } catch (error) {
    console.error('[chat] could not load titles for the suggested prompts', error);
    return FALLBACK_COMPARISON;
  }
}

/** The question behind the dashboard's Ask AI link. Anything but a valid title gives no draft. */
export function getAskDraft(title: unknown): string | undefined {
  const parsed = gameInputSchema.shape.title.safeParse(title);
  return parsed.success ? `Tell me about ${parsed.data}: its revenue, downloads and rating.` : undefined;
}

/**
 * The three example questions of the assessment. The comparison uses real titles,
 * because the "Game A vs Game B" of the brief would always answer "not found".
 */
export function getSuggestedPrompts(): string[] {
  return ['Which game made the most revenue last month?', 'How many games are rated above 4?', getComparisonPrompt()];
}
