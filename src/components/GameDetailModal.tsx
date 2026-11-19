'use client';

import React, { useEffect } from 'react';
import { Calendar, DollarSign, Download, Pencil, Star, Tag, UserCheck, X } from 'lucide-react';
import type { Game } from '@/types/game';

interface GameDetailModalProps {
    game: Game | null;
    onClose: () => void;
    onEdit: (game: Game) => void;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
}

export function GameDetailModal({ game, onClose, onEdit }: GameDetailModalProps) {
    useEffect(() => {
        if (!game) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [game, onClose]);

    if (!game) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-detail-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2
                                id="game-detail-title"
                                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
                            >
                                {game.title}
                            </h2>
                            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                <Tag className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                                {game.genre}
                            </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <UserCheck className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                            Developed by{' '}
                            <span className="text-zinc-800 dark:text-zinc-200">
                                {game.developer}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close game details"
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    <div>
                        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Description
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                            {game.description?.trim()
                                ? game.description
                                : 'No description provided for this title yet.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Monthly Revenue
                            </div>
                            <p className="mt-1 text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(game.monthly_revenue_usd)}
                            </p>
                        </div>

                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <Download className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                                Monthly Downloads
                            </div>
                            <p className="mt-1 text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                {formatNumber(game.monthly_downloads)}
                            </p>
                        </div>

                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <Star className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                                Average Rating
                            </div>
                            <p className="mt-1 text-base font-semibold tabular-nums text-amber-600 dark:text-amber-300">
                                {game.average_rating.toFixed(2)} / 5
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-[11px] text-zinc-500 dark:border-zinc-800/80">
                        <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {game.created_at}
                        </span>
                        <span>Updated: {game.updated_at}</span>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onEdit(game);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
