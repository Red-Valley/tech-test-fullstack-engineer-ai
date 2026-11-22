'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MetricCards, type CatalogStatsData } from '@/components/dashboard/MetricCards';
import { GameTable } from '@/components/dashboard/GameTable';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Gamepad2, Info } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<CatalogStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [allGenres, setAllGenres] = useState<string[]>([]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/games/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
          if (json.data.genre_breakdown) {
            const genres = json.data.genre_breakdown.map(
              (g: { genre: string }) => g.genre
            );
            setAllGenres(genres);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-600/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                Indie Games Studio Dashboard
              </h1>
              <p className="text-xs text-slate-400">
                Internal catalog management &amp; AI assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Local SQLite (games.db)
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Metrics Row */}
        <section aria-label="Catalog summary metrics">
          <MetricCards stats={stats} isLoading={statsLoading} />
        </section>

        {/* Notice on Revenue Semantics */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong className="text-slate-300">Data Model Note:</strong> Monthly revenue and download figures reflect recorded catalog snapshot values. The catalog does not record calendar months or reporting-period timestamps.
          </span>
        </div>

        {/* Main Grid: Table (7 cols) + AI Chat (5 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <section className="xl:col-span-7 h-full" aria-label="Game catalog table">
            <GameTable allGenres={allGenres} onDataChange={fetchStats} />
          </section>

          <section className="xl:col-span-5 h-full" aria-label="AI chat copilot">
            <ChatPanel />
          </section>
        </div>
      </main>
    </div>
  );
}
