'use client';

import React from 'react';
import { Gamepad2, DollarSign, Star, Trophy } from 'lucide-react';

export interface CatalogStatsData {
  total_games: number;
  total_monthly_revenue_usd: number;
  average_monthly_downloads: number;
  average_rating: number;
  top_earner: {
    id: string;
    title: string;
    developer: string;
    monthly_revenue_usd: number;
  } | null;
  genre_breakdown: { genre: string; count: number }[];
}

interface MetricCardsProps {
  stats: CatalogStatsData | null;
  isLoading: boolean;
}

export function MetricCards({ stats, isLoading }: MetricCardsProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cards = [
    {
      title: 'Total Games',
      value: isLoading ? '...' : (stats?.total_games ?? 0).toString(),
      subtitle: 'Active titles in catalog',
      icon: Gamepad2,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Total Stored Monthly Revenue',
      value: isLoading ? '...' : formatCurrency(stats?.total_monthly_revenue_usd ?? 0),
      subtitle: 'Catalog sum (no reporting period timestamp)',
      icon: DollarSign,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Average Rating',
      value: isLoading ? '...' : `${stats?.average_rating?.toFixed(1) ?? '0.0'} ★`,
      subtitle: 'Across all catalog games',
      icon: Star,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Highest Stored Monthly Revenue',
      value: isLoading
        ? '...'
        : stats?.top_earner
        ? stats.top_earner.title
        : 'None',
      subtitle: isLoading
        ? '...'
        : stats?.top_earner
        ? `${formatCurrency(stats.top_earner.monthly_revenue_usd)} (stored value)`
        : 'No records available',
      icon: Trophy,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-4 transition-all hover:border-slate-700"
          >
            <div className={`p-3 rounded-lg border ${card.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-400 truncate">{card.title}</p>
              <p className="text-xl font-bold text-white mt-1 truncate">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
