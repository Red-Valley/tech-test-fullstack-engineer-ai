'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Check,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Download,
    Gamepad2,
    Loader2,
    LogOut,
    Pencil,
    Plus,
    Search,
    Star,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import type { CatalogStats, Game, GameListFilter } from '@/types/game';
import type { User } from '@/types/user';
import { ChatPanel } from './ChatPanel';
import { ThemeToggle } from './ThemeProvider';

const GameDetailModal = dynamic(() => import('./GameDetailModal').then((m) => m.GameDetailModal));
const GameModal = dynamic(() => import('./GameModal').then((m) => m.GameModal));
const UserManagementModal = dynamic(() =>
    import('./UserManagementModal').then((m) => m.UserManagementModal),
);

type SortColumn =
    'title' | 'genre' | 'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating';

const PAGE_SIZE = 7;

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function formatCurrency(value: number): string {
    return CURRENCY_FORMATTER.format(value);
}

function formatNumber(value: number): string {
    return NUMBER_FORMATTER.format(value);
}

interface DashboardProps {
    currentUser?: User;
    onCurrentUserUpdated?: (user: User) => void;
    onLogout?: () => void | Promise<void>;
}

export function Dashboard({ currentUser, onCurrentUserUpdated, onLogout }: DashboardProps) {
    const [games, setGames] = useState<Game[]>([]);
    const [stats, setStats] = useState<CatalogStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & sorting
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [genreFilter, setGenreFilter] = useState('');
    const [minRatingFilter, setMinRatingFilter] = useState('');
    const [sortBy, setSortBy] = useState<SortColumn>('monthly_revenue_usd');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [detailGame, setDetailGame] = useState<Game | null>(null);
    const [usersModalOpen, setUsersModalOpen] = useState(false);

    // Delete confirmation state
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Mobile tab state
    const [mobileTab, setMobileTab] = useState<'catalog' | 'chat'>('catalog');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, genreFilter, minRatingFilter, sortBy, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedGames = useMemo(
        () => games.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [games, safePage],
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 200);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchGames = useCallback(async () => {
        setError(null);
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (genreFilter) params.set('genre', genreFilter);
        if (minRatingFilter) params.set('minRating', minRatingFilter);
        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);

        try {
            const res = await fetch(`/api/games?${params.toString()}`, {
                cache: 'no-store',
            });
            const data = (await res.json().catch(() => ({}))) as {
                games?: Game[];
                stats?: CatalogStats;
                error?: string;
            };

            if (!res.ok) {
                throw new Error(data.error || `Failed to load games (${res.status})`);
            }

            setGames(data.games ?? []);
            setStats(data.stats ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load catalog data.');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, genreFilter, minRatingFilter, sortBy, sortOrder]);

    useEffect(() => {
        void fetchGames();
    }, [fetchGames]);

    const availableGenres = useMemo(() => {
        if (!stats?.genres) return [];
        return [...stats.genres].map((g) => g.genre).sort((a, b) => a.localeCompare(b));
    }, [stats]);

    const handleSort = (column: SortColumn) => {
        if (sortBy === column) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(column);
            setSortOrder(column === 'title' || column === 'genre' ? 'asc' : 'desc');
        }
    };

    const renderSortIcon = (column: SortColumn) => {
        if (sortBy !== column) {
            return <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />;
        }
        return sortOrder === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
        ) : (
            <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
        );
    };

    const handleOpenCreate = () => {
        setEditingGame(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (game: Game) => {
        setEditingGame(game);
        setModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                throw new Error(data.error || `Failed to delete game (${res.status})`);
            }
            setConfirmDeleteId(null);
            await fetchGames();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete game.');
        } finally {
            setDeletingId(null);
        }
    };

    const resetFilters = () => {
        setSearchInput('');
        setDebouncedSearch('');
        setGenreFilter('');
        setMinRatingFilter('');
    };

    const hasActiveFilters = Boolean(searchInput || genreFilter || minRatingFilter);

    // Unused import guard for GameListFilter if needed by external consumers
    const _filterPreview: GameListFilter = {
        search: debouncedSearch || undefined,
        genre: genreFilter || undefined,
        minRating: minRatingFilter ? Number(minRatingFilter) : undefined,
        sortBy,
        sortOrder,
    };
    void _filterPreview;

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
            {/* Top Header */}
            <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/90">
                <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/30 dark:bg-indigo-600/20 dark:text-indigo-400">
                            <Gamepad2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                IndiePulse
                            </h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Indie Games Catalog &amp; AI Revenue Analyst
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Mobile view toggle */}
                        <div className="flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
                            <button
                                type="button"
                                onClick={() => setMobileTab('catalog')}
                                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                                    mobileTab === 'catalog'
                                        ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                            >
                                Catalog
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileTab('chat')}
                                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                                    mobileTab === 'chat'
                                        ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                            >
                                AI Analyst
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-indigo-500"
                        >
                            <Plus className="h-4 w-4" />
                            Add Game
                        </button>

                        <ThemeToggle />

                        {currentUser && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setUsersModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                                >
                                    <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                    Users
                                </button>

                                <div className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 sm:flex dark:border-zinc-800 dark:bg-zinc-900/70">
                                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                        {currentUser.name}
                                    </span>
                                    <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                                        {currentUser.role}
                                    </span>
                                </div>

                                {onLogout && (
                                    <button
                                        type="button"
                                        onClick={() => void onLogout()}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                        title="Sign out"
                                        aria-label="Sign out"
                                    >
                                        <LogOut className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Split-Pane Content */}
            <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px]">
                {/* Left Pane: KPIs + Filters + Table */}
                <section
                    aria-label="Games Catalog"
                    className={`min-w-0 space-y-5 ${
                        mobileTab === 'chat' ? 'hidden lg:block' : 'block'
                    }`}
                >
                    {/* 4 KPI Cards */}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-none">
                            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Total Games</span>
                                <Gamepad2 className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                {stats ? formatNumber(stats.total_games) : '—'}
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-500">
                                {stats?.genres
                                    ? `${stats.genres.length} active genres`
                                    : 'Loading catalog...'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-none">
                            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Monthly Revenue</span>
                                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                {stats ? formatCurrency(stats.total_monthly_revenue_usd) : '—'}
                            </div>
                            <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                {stats?.highest_revenue_game ? (
                                    <>
                                        Top:{' '}
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {stats.highest_revenue_game.title}
                                        </span>
                                    </>
                                ) : (
                                    'No revenue data'
                                )}
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-none">
                            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Monthly Downloads</span>
                                <Download className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                {stats ? formatNumber(stats.total_monthly_downloads) : '—'}
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-500">
                                Across all catalog titles
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-none">
                            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Avg Rating</span>
                                <Star className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                {stats ? stats.average_rating.toFixed(2) : '—'}
                                <span className="ml-1 text-xs font-normal text-zinc-500">
                                    / 5.0
                                </span>
                            </div>
                            <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                {stats?.highest_rated_game ? (
                                    <>
                                        Highest:{' '}
                                        <span className="font-medium text-amber-600 dark:text-amber-300">
                                            {stats.highest_rated_game.title}
                                        </span>
                                    </>
                                ) : (
                                    'No ratings yet'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-none">
                        <div className="relative min-w-50 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                            <label htmlFor="catalog-search" className="sr-only">
                                Search games by title or developer
                            </label>
                            <input
                                id="catalog-search"
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search title or developer..."
                                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-1.5 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-950"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <label htmlFor="genre-filter" className="sr-only">
                                Filter by genre
                            </label>
                            <select
                                id="genre-filter"
                                value={genreFilter}
                                onChange={(e) => setGenreFilter(e.target.value)}
                                className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                            >
                                <option value="">All Genres</option>
                                {availableGenres.map((genre) => (
                                    <option key={genre} value={genre}>
                                        {genre}
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="rating-filter" className="sr-only">
                                Minimum rating
                            </label>
                            <select
                                id="rating-filter"
                                value={minRatingFilter}
                                onChange={(e) => setMinRatingFilter(e.target.value)}
                                className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                            >
                                <option value="">All Ratings</option>
                                <option value="4">4.0+ Stars</option>
                                <option value="4.5">4.5+ Stars</option>
                            </select>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
                        >
                            {error}
                        </div>
                    )}

                    {/* Sortable Games Table */}
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-none">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                                        <th className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => handleSort('title')}
                                                className="inline-flex items-center gap-1.5 transition hover:text-zinc-100"
                                            >
                                                Title
                                                {renderSortIcon('title')}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => handleSort('genre')}
                                                className="inline-flex items-center gap-1.5 transition hover:text-zinc-100"
                                            >
                                                Genre
                                                {renderSortIcon('genre')}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleSort('monthly_revenue_usd')}
                                                className="inline-flex items-center justify-end gap-1.5 transition hover:text-zinc-100"
                                            >
                                                Monthly Revenue
                                                {renderSortIcon('monthly_revenue_usd')}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleSort('monthly_downloads')}
                                                className="inline-flex items-center justify-end gap-1.5 transition hover:text-zinc-100"
                                            >
                                                Downloads
                                                {renderSortIcon('monthly_downloads')}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleSort('average_rating')}
                                                className="inline-flex items-center justify-end gap-1.5 transition hover:text-zinc-100"
                                            >
                                                Rating
                                                {renderSortIcon('average_rating')}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/70">
                                    {isLoading ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                                            >
                                                <div className="inline-flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                                                    <span>Loading catalog...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : games.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                                            >
                                                {hasActiveFilters
                                                    ? 'No games match the current filters.'
                                                    : 'No games in catalog yet. Click + Add Game to create one.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedGames.map((game) => {
                                            const isConfirming = confirmDeleteId === game.id;
                                            const isDeleting = deletingId === game.id;

                                            return (
                                                <tr
                                                    key={game.id}
                                                    className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/35"
                                                >
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailGame(game)}
                                                            className="text-left font-medium text-zinc-900 transition hover:text-indigo-600 hover:underline focus:outline-none focus:underline dark:text-zinc-100 dark:hover:text-indigo-400"
                                                        >
                                                            {game.title}
                                                        </button>
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            {game.developer}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300">
                                                            {game.genre}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(game.monthly_revenue_usd)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                                                        {formatNumber(game.monthly_downloads)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                                                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                                            {game.average_rating.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {isConfirming ? (
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        void handleDelete(game.id)
                                                                    }
                                                                    disabled={isDeleting}
                                                                    aria-label={`Confirm delete ${game.title}`}
                                                                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                                                                >
                                                                    {isDeleting ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <Check className="h-3 w-3" />
                                                                    )}
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setConfirmDeleteId(null)
                                                                    }
                                                                    disabled={isDeleting}
                                                                    aria-label={`Cancel delete ${game.title}`}
                                                                    className="rounded-md border border-zinc-700 bg-zinc-800 p-1 text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOpenEdit(game)
                                                                    }
                                                                    aria-label={`Edit ${game.title}`}
                                                                    title="Edit game"
                                                                    className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setConfirmDeleteId(game.id)
                                                                    }
                                                                    aria-label={`Delete ${game.title}`}
                                                                    title="Delete game"
                                                                    className="rounded-md p-1.5 text-zinc-400 transition hover:bg-red-500/15 hover:text-red-400"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {!isLoading && games.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                                <span>
                                    Showing{' '}
                                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                                        {(safePage - 1) * PAGE_SIZE + 1}
                                    </span>
                                    –
                                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                                        {Math.min(safePage * PAGE_SIZE, games.length)}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                                        {games.length}
                                    </span>{' '}
                                    games
                                </span>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={safePage <= 1}
                                        aria-label="Previous page"
                                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Prev
                                    </button>

                                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                                        (pageNum) => (
                                            <button
                                                key={pageNum}
                                                type="button"
                                                onClick={() => setCurrentPage(pageNum)}
                                                aria-label={`Page ${pageNum}`}
                                                aria-current={
                                                    pageNum === safePage ? 'page' : undefined
                                                }
                                                className={`h-7 min-w-7 rounded-lg px-2 font-medium tabular-nums transition ${
                                                    pageNum === safePage
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        ),
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                                        }
                                        disabled={safePage >= totalPages}
                                        aria-label="Next page"
                                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                        Next
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Pane: AI Chat Panel */}
                <div
                    className={`lg:sticky lg:top-6 lg:h-[calc(100vh-7.5rem)] ${
                        mobileTab === 'catalog' ? 'hidden lg:block' : 'block'
                    }`}
                >
                    <ChatPanel onCatalogMutated={() => void fetchGames()} />
                </div>
            </main>

            {/* Game Details Modal */}
            {detailGame && (
                <GameDetailModal
                    game={detailGame}
                    onClose={() => setDetailGame(null)}
                    onEdit={(game) => handleOpenEdit(game)}
                />
            )}

            {/* Create / Edit Modal */}
            {modalOpen && (
                <GameModal
                    isOpen={modalOpen}
                    game={editingGame}
                    existingGenres={availableGenres}
                    onClose={() => setModalOpen(false)}
                    onSaved={() => void fetchGames()}
                />
            )}

            {/* User Management Modal */}
            {currentUser && usersModalOpen && (
                <UserManagementModal
                    isOpen={usersModalOpen}
                    currentUser={currentUser}
                    onClose={() => setUsersModalOpen(false)}
                    onCurrentUserUpdated={onCurrentUserUpdated}
                />
            )}
        </div>
    );
}
