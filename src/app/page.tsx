import { connection } from "next/server";
import { Suspense } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { CatalogSection } from "@/components/games/CatalogSection";
import { parseCatalogView } from "@/lib/games/catalog-view";
import { getRepository } from "@/lib/games/repository";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <DashboardShell>
      <Suspense fallback={<p className="text-[13px] text-muted">Loading games…</p>}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </DashboardShell>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  // better-sqlite3 is synchronous: without this the query would run once at build time.
  await connection();
  const view = parseCatalogView(await searchParams);
  const repository = getRepository();
  return (
    <CatalogSection
      games={repository.queryCatalog(view)}
      total={repository.countGames()}
      genres={repository.listGenres()}
      maxRevenue={repository.maxRevenue()}
      view={view}
    />
  );
}
