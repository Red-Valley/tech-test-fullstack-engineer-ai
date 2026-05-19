import type { Game } from "@/lib/games/types";
import { formatCurrency, formatCompact, formatRating } from "@/lib/games/format";

type Props = {
  game: Game;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
};

export default function GameCard({ game, onEdit, onDelete }: Props) {
  return (
    <article className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex-1">
        <h2 className="text-lg font-semibold leading-tight text-neutral-900">
          {game.title}
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          {game.developer} · {game.genre}
        </p>
      </div>

      <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-xs text-neutral-400">Revenue</dt>
          <dd className="mt-0.5 text-sm font-medium text-neutral-700">
            {formatCurrency(game.monthly_revenue_usd)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-400">Downloads</dt>
          <dd className="mt-0.5 text-sm font-medium text-neutral-700">
            {formatCompact(game.monthly_downloads)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-400">Rating</dt>
          <dd className="mt-0.5 flex items-center justify-center gap-1 text-sm font-medium text-neutral-700">
            <span aria-hidden="true">★</span>
            {formatRating(game.average_rating)}
          </dd>
        </div>
      </dl>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(game)}
          className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(game)}
          className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
