"use client";

import { MagnifyingGlass, Sparkle, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDashboard } from "@/components/DashboardShell";
import { viewHref, type CatalogView } from "@/lib/games/catalog-view";

const SEARCH_DELAY_MS = 250;

type Props = { view: CatalogView; genres: string[]; shown: number; total: number };

/** Search, genre filter, last-answer highlight tag and count. Filters live in the URL. */
export function CatalogToolbar({ view, genres, shown, total }: Props) {
  const router = useRouter();
  const { highlightIds, setHighlightIds } = useDashboard();
  const [draft, setDraft] = useState(view.q);
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow URL changes made elsewhere (e.g. "Clear filters"), unless the user is mid-typing.
  useEffect(() => {
    if (!pending.current) setDraft(view.q);
  }, [view.q]);

  useEffect(() => () => clearTimeout(pending.current), []);

  const go = (next: CatalogView) => router.replace(viewHref(next), { scroll: false });

  function search(text: string) {
    setDraft(text);
    clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      pending.current = undefined;
      go({ ...view, q: text.trim() });
    }, SEARCH_DELAY_MS);
  }

  const selectedGenre = genres.find((genre) => genre.toLowerCase() === view.genre.toLowerCase()) ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-[300px] flex-[1_1_220px]">
        <MagnifyingGlass size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 opacity-55" />
        <input
          type="search"
          value={draft}
          onChange={(event) => search(event.target.value)}
          placeholder="Search title or developer"
          aria-label="Search games"
          className="input w-full pl-8 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>
      <select
        value={selectedGenre}
        onChange={(event) => go({ ...view, genre: event.target.value })}
        aria-label="Genre"
        className="input min-w-[140px]"
      >
        <option value="">All genres</option>
        {genres.map((genre) => (
          <option key={genre} value={genre}>
            {genre}
          </option>
        ))}
      </select>
      {highlightIds.length > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-accent py-[3px] pr-1 pl-[9px] text-[11px] whitespace-nowrap text-accent">
          <Sparkle size={12} aria-hidden />
          {highlightIds.length} from last answer
          <button
            type="button"
            onClick={() => setHighlightIds([])}
            aria-label="Clear highlight"
            className="btn btn-ghost size-[18px] rounded-sm p-0 text-accent"
          >
            <X size={11} aria-hidden />
          </button>
        </span>
      )}
      <span className="ml-auto text-xs text-muted tabular-nums">
        {shown === total ? `${total} ${total === 1 ? "game" : "games"}` : `${shown} of ${total} games`}
      </span>
    </div>
  );
}
