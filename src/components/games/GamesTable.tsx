"use client";

import { CaretDown, CaretUp, PencilSimple, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/DashboardShell";
import type { Game } from "@/lib/db/schema";
import { toggleSort, viewHref, type CatalogView, type SortKey } from "@/lib/games/catalog-view";
import { formatCount, formatRating, formatUsd } from "@/lib/games/format";

const COLUMNS: { key: SortKey; label: string; width?: string; numeric?: boolean; title?: string }[] = [
  { key: "title", label: "Game" },
  { key: "revenue", label: "Revenue / mo", width: "w-32", numeric: true, title: "Monthly revenue" },
  { key: "downloads", label: "Downloads", width: "w-28", numeric: true },
  { key: "rating", label: "Rating", width: "w-[84px]", numeric: true },
];

type Props = { games: Game[]; total: number; maxRevenue: number; view: CatalogView };

export function GamesTable({ games, total, maxRevenue, view }: Props) {
  const router = useRouter();
  const { highlightIds, rail, openEditor, requestDelete } = useDashboard();
  const go = (next: CatalogView) => router.replace(viewHref(next), { scroll: false });

  if (games.length === 0) {
    const filtered = total > 0;
    return (
      <div className="flex flex-col items-start gap-1.5 px-2.5 py-10">
        <h2 className="text-base">{filtered ? "No games match" : "No games yet"}</h2>
        <p className="text-[13px] text-muted">
          {filtered ? "Try a different search or genre." : "Add your first game to start tracking the catalog."}
        </p>
        <button
          type="button"
          onClick={() => (filtered ? go({ ...view, q: "", genre: "" }) : openEditor())}
          className="btn btn-secondary mt-1 px-2.5 py-1 text-[13px]"
        >
          {filtered ? "Clear filters" : "Add game"}
        </button>
      </div>
    );
  }

  const selectedId = rail.mode === "edit" ? rail.game.id : null;

  return (
    <div className="relative overflow-x-auto overflow-y-hidden">
      <table className="w-full table-fixed text-[13px]">
        <colgroup>
          {COLUMNS.map(({ key, width }) => (
            <col key={key} className={width} />
          ))}
          <col className="w-[76px]" />
        </colgroup>
        <thead>
          <tr className="[background:linear-gradient(to_right,transparent,var(--color-divider)_48px,var(--color-divider)_calc(100%-48px),transparent)_no-repeat_bottom/100%_1px]">
            {COLUMNS.map(({ key, label, numeric, title }) => {
              const active = view.sort === key;
              const Caret = view.dir === "asc" ? CaretUp : CaretDown;
              return (
                <th
                  key={key}
                  scope="col"
                  aria-sort={active ? (view.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={`px-1 py-1 font-normal ${numeric ? "text-right" : "text-left"}`}
                >
                  <button
                    type="button"
                    title={title}
                    onClick={() => go(toggleSort(view, key))}
                    className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-[11px] tracking-[.08em] whitespace-nowrap uppercase hover:text-text ${
                      active ? "text-text/80" : "text-text/60"
                    }`}
                  >
                    {label}
                    {active && <Caret size={12} aria-hidden />}
                  </button>
                </th>
              );
            })}
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => {
            const highlighted = highlightIds.includes(game.id);
            const selected = game.id === selectedId;
            const cell = `px-2.5 py-2 ${selected ? "bg-accent-800/55" : highlighted ? "bg-accent-900/80" : "group-hover:bg-text/4"}`;
            const share = maxRevenue > 0 ? (game.monthly_revenue_usd / maxRevenue) * 100 : 0;
            return (
              <tr key={game.id} aria-current={selected ? "true" : undefined} className="group row-rule">
                <td className={cell}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-1.5 shrink-0 rounded-full ${highlighted || selected ? "bg-accent shadow-glow" : "bg-neutral-800"}`}
                    />
                    <div className="min-w-0">
                      <div title={game.title} className={`truncate font-medium ${highlighted ? "text-accent-300" : ""}`}>
                        {game.title}
                        {highlighted && <span className="sr-only"> (mentioned in last answer)</span>}
                      </div>
                      {/* 60% on the selected row keeps the subline above 4.5:1 contrast (research §7). */}
                      <div
                        title={`${game.developer} · ${game.genre}`}
                        className={`truncate text-xs ${selected ? "text-text/60" : "text-muted"}`}
                      >
                        {game.developer} · {game.genre}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={cell}>
                  <div className="flex flex-col items-end gap-[5px]">
                    <span className="tabular-nums">{formatUsd(game.monthly_revenue_usd)}</span>
                    <span aria-hidden className="flex h-0.5 w-[72px] justify-end bg-neutral-800">
                      <span
                        className="h-full bg-accent shadow-[0_0_6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)]"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className={`${cell} text-right tabular-nums`}>{formatCount(game.monthly_downloads)}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatRating(game.average_rating)}</td>
                <td className={`${cell} px-1.5`}>
                  <div className="flex justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEditor(game)}
                      aria-label={`Edit ${game.title}`}
                      className="btn btn-ghost size-[30px] p-0 text-accent"
                    >
                      <PencilSimple size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(game)}
                      aria-label={`Delete ${game.title}`}
                      className="btn btn-ghost size-[30px] p-0 text-neutral-400"
                    >
                      <Trash size={15} aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
