'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { Game } from '@/lib/types';
import { GameFormModal } from './GameFormModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface GameTableProps {
  allGenres: string[];
  onDataChange: () => void;
}

export function GameTable({ allGenres, onDataChange }: GameTableProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and sorting state
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState<keyof Game>('monthly_revenue_usd');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedGenre) params.set('genre', selectedGenre);
      params.set('sort_by', sortBy);
      params.set('order', order);
      params.set('limit', limit.toString());
      params.set('offset', ((page - 1) * limit).toString());

      const res = await fetch(`/api/games?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load games (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setGames(json.data);
        setTotal(json.total);
      } else {
        throw new Error(json.error || 'Failed to load games');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedGenre, sortBy, order, page, limit]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleSort = (field: keyof Game) => {
    if (sortBy === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setOrder('desc');
    }
    setPage(1);
  };

  const handleOpenCreate = () => {
    setEditingGame(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (game: Game) => {
    setEditingGame(game);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (game: Game) => {
    setDeletingGame(game);
    setIsDeleteOpen(true);
  };

  const handleMutationSuccess = () => {
    fetchGames();
    onDataChange();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Controls Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or developer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Genre Filter */}
          <div className="sm:w-44">
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Genres ({allGenres.length})</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Game Button */}
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Game</span>
        </button>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-x-auto min-h-[360px]">
        {error ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-sm text-rose-300">{error}</p>
            <button
              onClick={fetchGames}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading catalog records...</span>
          </div>
        ) : games.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-base font-medium text-slate-300">No games found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or genre filter.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800 tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort('title')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Title</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('developer')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Developer</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('genre')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Genre</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('monthly_revenue_usd')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Monthly Revenue</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('monthly_downloads')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Downloads</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('average_rating')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Rating</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {games.map((game) => (
                <tr
                  key={game.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3 px-4 font-medium text-white">{game.title}</td>
                  <td className="py-3 px-4 text-slate-300">{game.developer}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {game.genre}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                    {formatCurrency(game.monthly_revenue_usd)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">
                    {formatNumber(game.monthly_downloads)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                        game.average_rating >= 4.5
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : game.average_rating >= 4.0
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {game.average_rating.toFixed(1)} ★
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(game)}
                        title="Edit game"
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(game)}
                        title="Delete game"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
        <span>
          Showing {games.length > 0 ? (page - 1) * limit + 1 : 0}–
          {Math.min(page * limit, total)} of {total} games
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <GameFormModal
        isOpen={isFormOpen}
        game={editingGame}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleMutationSuccess}
      />
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        game={deletingGame}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={handleMutationSuccess}
      />
    </div>
  );
}
