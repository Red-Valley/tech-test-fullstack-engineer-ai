import type { Game } from '@/client/domain/game';
import { cn } from '@/client/lib/cn';
import { formatNumber, formatRating, formatUsd } from '@/client/lib/format';
import { Badge } from '@/client/ui/components/primitives/feedback';

type GameRowProps = {
  game: Game;
  highlighted: boolean;
  actions?: React.ReactNode;
};

export function GameRow({ game, highlighted, actions }: GameRowProps) {
  return (
    <tr
      data-highlighted={highlighted || undefined}
      className={cn('border-t border-border transition-colors', highlighted && 'bg-highlight')}
    >
      <th scope="row" className="px-3 py-2.5 text-left font-medium">
        <div className="max-w-[16rem] truncate" title={game.title}>
          {game.title}
        </div>
        <div
          className="max-w-[16rem] truncate text-xs font-normal text-muted"
          title={game.developer}
        >
          {game.developer}
        </div>
      </th>
      <td className="px-3 py-2.5">
        <Badge>{game.genre}</Badge>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{formatUsd(game.monthlyRevenueUsd)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(game.monthlyDownloads)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{formatRating(game.averageRating)}</td>
      {actions !== undefined && (
        <td className="px-3 py-2.5 text-right whitespace-nowrap">{actions}</td>
      )}
    </tr>
  );
}
