import { useId } from 'react';
import { formatNumber, formatRating, formatUSD } from '@/lib/format';
import type { Game } from '@/lib/types';
import { GameActions } from './GameActions';

export function GameCard({ game, onEdit }: { game: Game; onEdit: () => void }) {
  const titleId = useId();

  return (
    <li aria-labelledby={titleId} className="flex flex-col justify-between gap-4 rounded-xl bg-surface-low p-4 shadow-lg hover:bg-surface">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-md bg-surface-high px-2 py-1 font-mono text-xs text-secondary [overflow-wrap:anywhere]">{game.genre}</span>
          <span className="font-mono text-sm font-bold whitespace-nowrap text-tertiary">{formatRating(game.average_rating)}</span>
        </div>
        <h3 id={titleId} className="font-display text-lg font-bold [overflow-wrap:anywhere]">
          {game.title}
        </h3>
        <p className="text-sm text-muted [overflow-wrap:anywhere]">{game.developer}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-surface-lowest p-3">
        <div>
          <dt className="font-mono text-[11px] tracking-wider text-outline uppercase">Revenue</dt>
          <dd className="font-mono text-sm font-bold text-tertiary tabular-nums [overflow-wrap:anywhere]">{formatUSD(game.monthly_revenue_usd)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] tracking-wider text-outline uppercase">Downloads</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums [overflow-wrap:anywhere]">{formatNumber(game.monthly_downloads)}</dd>
        </div>
      </dl>
      <GameActions game={game} onEdit={onEdit} />
    </li>
  );
}
