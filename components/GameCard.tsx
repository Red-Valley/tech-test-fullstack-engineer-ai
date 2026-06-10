import { DollarSign, Pencil, Star, Trash2, Users } from "lucide-react";
import type { Game } from "../lib/games";

type GameCardProps = {
  game: Game;
  onDelete: (id: string) => void;
  onEdit: (game: Game) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function GameCard({ game, onDelete, onEdit }: GameCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-cyan-400/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{game.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{game.developer}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            {game.genre}
          </span>
          <button
            type="button"
            onClick={() => onEdit(game)}
            className="rounded-full border border-white/10 p-1.5 text-slate-400 transition hover:border-cyan-500/40 hover:text-cyan-400"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(game.id)}
            className="rounded-full border border-white/10 p-1.5 text-slate-400 transition hover:border-rose-500/40 hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <DollarSign className="h-4 w-4 text-cyan-400" />
            Revenue
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatCurrency(game.monthly_revenue_usd)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="h-4 w-4 text-cyan-400" />
            Downloads
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatNumber(game.monthly_downloads)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 sm:col-span-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Rating
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {game.average_rating.toFixed(1)} / 5
          </p>
        </div>
      </div>
    </article>
  );
}