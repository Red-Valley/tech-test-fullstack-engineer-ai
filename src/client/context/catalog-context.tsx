'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// The only context in the app (ARCHITECTURE.md §4.5). It carries the two things that cross
// the dashboard/chat boundary: rows the chat wants highlighted, and a refetch signal.
type CatalogContextValue = {
  highlightedGameIds: ReadonlySet<number>;
  setHighlightedGameIds: (ids: Iterable<number>) => void;
  /** Bumped by refreshCatalog(); data hooks take it as a dependency and refetch. */
  catalogVersion: number;
  refreshCatalog: () => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [highlighted, setHighlighted] = useState<ReadonlySet<number>>(() => new Set());
  const [catalogVersion, setCatalogVersion] = useState(0);

  const setHighlightedGameIds = useCallback(
    (ids: Iterable<number>) => setHighlighted(new Set(ids)),
    [],
  );
  const refreshCatalog = useCallback(() => setCatalogVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({
      highlightedGameIds: highlighted,
      setHighlightedGameIds,
      catalogVersion,
      refreshCatalog,
    }),
    [highlighted, setHighlightedGameIds, catalogVersion, refreshCatalog],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return value;
}
