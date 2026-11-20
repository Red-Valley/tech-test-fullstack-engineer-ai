import type { Game, GameFormErrors, GameFormValues, GameStats } from '@/client/domain/game';
import type { GameDto, GameInputDto, GameStatsDto } from '@/shared/types/game.dto';

export const toGame = (dto: GameDto): Game => ({
  id: dto.id,
  title: dto.title,
  developer: dto.developer,
  genre: dto.genre,
  monthlyRevenueUsd: dto.monthly_revenue_usd,
  monthlyDownloads: dto.monthly_downloads,
  averageRating: dto.average_rating,
});

export const toGames = (dtos: GameDto[]): Game[] => dtos.map(toGame);

export const toGameStats = (dto: GameStatsDto): GameStats => ({ ...dto });

export const emptyFormValues = (): GameFormValues => ({
  title: '',
  developer: '',
  genre: '',
  monthlyRevenueUsd: '',
  monthlyDownloads: '',
  averageRating: '',
});

export const toFormValues = (game: Game): GameFormValues => ({
  title: game.title,
  developer: game.developer,
  genre: game.genre,
  monthlyRevenueUsd: String(game.monthlyRevenueUsd),
  monthlyDownloads: String(game.monthlyDownloads),
  averageRating: String(game.averageRating),
});

/** Every field of the input DTO, but possibly missing: the shared Zod schema validates it next. */
export type GameInputDraft = { [K in keyof GameInputDto]: GameInputDto[K] | undefined };

/**
 * "" → undefined (so validation reports "required" instead of silently saving 0).
 * Thousands separators are allowed ("1,200"); anything else non-numeric becomes NaN, which
 * the schema also rejects.
 */
const toNumber = (raw: string): number | undefined => {
  const cleaned = raw.trim().replace(/,/g, '');
  return cleaned === '' ? undefined : Number(cleaned);
};

const blankToUndefined = (raw: string) => (raw.trim() === '' ? undefined : raw);

export const formValuesToInput = (values: GameFormValues): GameInputDraft => ({
  title: values.title,
  developer: values.developer,
  // The genre type is a fixed union; the schema checks the string is one of them.
  genre: blankToUndefined(values.genre) as GameInputDto['genre'] | undefined,
  monthly_revenue_usd: toNumber(values.monthlyRevenueUsd),
  monthly_downloads: toNumber(values.monthlyDownloads),
  average_rating: toNumber(values.averageRating),
});

const FIELD_NAMES: Record<keyof GameInputDto, keyof GameFormValues> = {
  title: 'title',
  developer: 'developer',
  genre: 'genre',
  monthly_revenue_usd: 'monthlyRevenueUsd',
  monthly_downloads: 'monthlyDownloads',
  average_rating: 'averageRating',
};

/** Maps snake_case field errors (from the schema or a 400 response) onto form fields. */
export const toFormErrors = (fieldErrors: Record<string, string[] | undefined>): GameFormErrors => {
  const errors: GameFormErrors = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    // hasOwn guards against inherited keys like "constructor"; after it the cast is safe.
    if (!Object.hasOwn(FIELD_NAMES, field) || !messages?.length) continue;
    errors[FIELD_NAMES[field as keyof GameInputDto]] = messages[0];
  }
  return errors;
};
