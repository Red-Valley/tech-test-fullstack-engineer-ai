import { Suspense } from "react";
import { connection } from "next/server";
import { GamesDashboard } from "@/components/games-dashboard";
import { getDb } from "@/lib/db";
import { createRepository } from "@/lib/games/repository";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Games catalog</h1>
        <p className="mt-1 text-sm text-slate-500">
          Last month&apos;s revenue, downloads, and rating for every indie game in the catalog.
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}

async function DashboardData() {
  // better-sqlite3 is synchronous: connection() keeps the query out of prerendering so it runs per request.
  await connection();
  const games = createRepository(getDb()).list();
  return <GamesDashboard games={games} />;
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  );
}
