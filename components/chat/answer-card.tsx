"use client";

import type { CatalogAnswer } from "@/lib/games/answer-types";
import type { Game } from "@/lib/games/types";
import { formatCurrency, formatCompact, formatRating } from "@/lib/games/format";

type Props = {
  answer: CatalogAnswer;
};

function GameMetrics({ game, highlight }: { game: Game; highlight?: boolean }) {
  return (
    <article
      className={`rounded-xl border p-4 ${
        highlight ? "border-sky-400 bg-sky-50" : "border-neutral-200 bg-white"
      }`}
    >
      <div className="mb-2">
        <h3 className="font-semibold leading-tight text-neutral-900">{game.title}</h3>
        <p className="text-xs text-neutral-500">
          {game.developer} · {game.genre}
        </p>
      </div>
      <dl className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs text-neutral-500">Revenue</dt>
          <dd className="text-xs font-medium text-neutral-700">
            {formatCurrency(game.monthly_revenue_usd)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs text-neutral-500">Downloads</dt>
          <dd className="text-xs font-medium text-neutral-700">
            {formatCompact(game.monthly_downloads)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs text-neutral-500">Rating</dt>
          <dd className="text-xs font-medium text-neutral-700">
            <span aria-hidden="true">★</span> {formatRating(game.average_rating)}
          </dd>
        </div>
      </dl>
      {highlight && (
        <p className="mt-2 text-center text-xs font-semibold text-sky-600">Winner</p>
      )}
    </article>
  );
}

function metricLabel(metric: "revenue" | "downloads" | "rating") {
  const labels = { revenue: "Revenue", downloads: "Downloads", rating: "Rating" };
  return labels[metric];
}

export default function AnswerCard({ answer }: Props) {
  const { summary, data } = answer;

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[90%] space-y-3 rounded-2xl rounded-bl-sm bg-neutral-100 px-3.5 py-3">
        <p className="text-sm leading-relaxed text-neutral-800">{summary}</p>

        {data.kind === "game" && (
          <GameMetrics game={data.game} />
        )}

        {data.kind === "games" && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
              {data.context}
            </p>
            <ul className="space-y-2">
              {data.games.map((game) => (
                <li key={game.id}>
                  <GameMetrics game={game} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.kind === "comparison" && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
              {metricLabel(data.metric)} comparison
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.games.map((game) => (
                <GameMetrics
                  key={game.id}
                  game={game}
                  highlight={data.winnerId === game.id}
                />
              ))}
            </div>
          </div>
        )}

        {data.kind === "count" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
            <p
              className="text-4xl font-bold text-sky-600"
              aria-label={`${data.value} ${data.context}`}
            >
              {data.value}
            </p>
            <p className="mt-1 text-sm text-neutral-500">{data.context}</p>
          </div>
        )}

        {data.kind === "stats" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <dt className="text-xs text-neutral-400">Games</dt>
                <dd className="mt-0.5 text-lg font-bold text-neutral-800">{data.totalGames}</dd>
              </div>
              <div className="text-center">
                <dt className="text-xs text-neutral-400">Avg Rating</dt>
                <dd className="mt-0.5 text-lg font-bold text-neutral-800">
                  {data.averageRating !== null ? (
                    <>
                      <span aria-hidden="true">★ </span>
                      {formatRating(data.averageRating)}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="text-center">
                <dt className="text-xs text-neutral-400">Total Revenue</dt>
                <dd className="mt-0.5 text-lg font-bold text-neutral-800">
                  {formatCurrency(data.totalMonthlyRevenue)}
                </dd>
              </div>
              <div className="text-center">
                <dt className="text-xs text-neutral-400">Genres</dt>
                <dd className="mt-0.5 text-lg font-bold text-neutral-800">{data.genres.length}</dd>
              </div>
            </dl>
            {data.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Genres">
                {data.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 border border-neutral-200"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
