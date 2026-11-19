'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { CreateGameSchema, type Game } from '@/types/game';

interface GameModalProps {
    isOpen: boolean;
    game: Game | null;
    existingGenres?: string[];
    onClose: () => void;
    onSaved: (game: Game) => void;
}

interface FormState {
    title: string;
    developer: string;
    genre: string;
    description: string;
    monthly_revenue_usd: string;
    monthly_downloads: string;
    average_rating: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
    title: '',
    developer: '',
    genre: '',
    description: '',
    monthly_revenue_usd: '',
    monthly_downloads: '',
    average_rating: '',
};

function toFormState(game: Game | null): FormState {
    if (!game) return EMPTY_FORM;
    return {
        title: game.title,
        developer: game.developer,
        genre: game.genre,
        description: game.description ?? '',
        monthly_revenue_usd: String(game.monthly_revenue_usd),
        monthly_downloads: String(game.monthly_downloads),
        average_rating: String(game.average_rating),
    };
}

export function GameModal({ isOpen, game, existingGenres = [], onClose, onSaved }: GameModalProps) {
    const [form, setForm] = useState<FormState>(() => toFormState(game));
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const titleInputRef = useRef<HTMLInputElement>(null);
    const isEditMode = game !== null;

    useEffect(() => {
        if (isOpen) {
            setForm(toFormState(game));
            setFieldErrors({});
            setServerError(null);
            setIsSubmitting(false);
            // Focus the first field after mount
            const timer = setTimeout(() => {
                titleInputRef.current?.focus();
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [isOpen, game]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) return null;

    const updateField = (field: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
        if (serverError) setServerError(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setServerError(null);

        const parsed = CreateGameSchema.safeParse({
            title: form.title,
            developer: form.developer,
            genre: form.genre,
            description: form.description,
            monthly_revenue_usd: form.monthly_revenue_usd,
            monthly_downloads: form.monthly_downloads,
            average_rating: form.average_rating,
        });

        if (!parsed.success) {
            const errors: FieldErrors = {};
            for (const issue of parsed.error.issues) {
                const key = issue.path[0] as keyof FormState | undefined;
                if (key && !errors[key]) {
                    errors[key] = issue.message;
                }
            }
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        setIsSubmitting(true);

        try {
            const url = isEditMode ? `/api/games/${game.id}` : '/api/games';
            const method = isEditMode ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed.data),
            });

            const data = (await res.json().catch(() => ({}))) as {
                game?: Game;
                error?: string;
            };

            if (!res.ok || !data.game) {
                setServerError(data.error || `Failed to ${isEditMode ? 'update' : 'create'} game.`);
                return;
            }

            onSaved(data.game);
            onClose();
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'Network error while saving game.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClassName = (hasError: boolean) =>
        `w-full rounded-lg border bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:bg-white focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-950 ${
            hasError
                ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
                : 'border-zinc-300 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-zinc-800'
        }`;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                    <div>
                        <h2
                            id="game-modal-title"
                            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
                        >
                            {isEditMode ? `Edit "${game.title}"` : 'Add Indie Game'}
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {isEditMode
                                ? 'Update catalog metrics and metadata.'
                                : 'Add a new title to the IndiePulse catalog.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Close modal"
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
                    {serverError && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
                        >
                            {serverError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label
                                htmlFor="game-title"
                                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                ref={titleInputRef}
                                id="game-title"
                                type="text"
                                value={form.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                placeholder="e.g. Balatro"
                                disabled={isSubmitting}
                                className={inputClassName(Boolean(fieldErrors.title))}
                            />
                            {fieldErrors.title && (
                                <p className="mt-1 text-xs text-red-400">{fieldErrors.title}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="game-developer"
                                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Developer <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="game-developer"
                                type="text"
                                value={form.developer}
                                onChange={(e) => updateField('developer', e.target.value)}
                                placeholder="e.g. LocalThunk"
                                disabled={isSubmitting}
                                className={inputClassName(Boolean(fieldErrors.developer))}
                            />
                            {fieldErrors.developer && (
                                <p className="mt-1 text-xs text-red-400">{fieldErrors.developer}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="game-genre"
                                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Genre <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="game-genre"
                                type="text"
                                list="indiepulse-genre-suggestions"
                                value={form.genre}
                                onChange={(e) => updateField('genre', e.target.value)}
                                placeholder="e.g. Roguelike"
                                disabled={isSubmitting}
                                className={inputClassName(Boolean(fieldErrors.genre))}
                            />
                            {existingGenres.length > 0 && (
                                <datalist id="indiepulse-genre-suggestions">
                                    {existingGenres.map((g) => (
                                        <option key={g} value={g} />
                                    ))}
                                </datalist>
                            )}
                            {fieldErrors.genre && (
                                <p className="mt-1 text-xs text-red-400">{fieldErrors.genre}</p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <label
                                htmlFor="game-description"
                                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Description
                            </label>
                            <textarea
                                id="game-description"
                                rows={3}
                                value={form.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                placeholder="Short overview of gameplay, loop, or standout features..."
                                disabled={isSubmitting}
                                className={inputClassName(Boolean(fieldErrors.description))}
                            />
                            {fieldErrors.description && (
                                <p className="mt-1 text-xs text-red-400">
                                    {fieldErrors.description}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="game-revenue"
                                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Monthly Revenue (USD) <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="game-revenue"
                                type="number"
                                min="0"
                                step="any"
                                value={form.monthly_revenue_usd}
                                onChange={(e) => updateField('monthly_revenue_usd', e.target.value)}
                                placeholder="e.g. 420000"
                                disabled={isSubmitting}
                                className={inputClassName(Boolean(fieldErrors.monthly_revenue_usd))}
                            />
                            {fieldErrors.monthly_revenue_usd && (
                                <p className="mt-1 text-xs text-red-400">
                                    {fieldErrors.monthly_revenue_usd}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="game-downloads"
                                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Monthly Downloads <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="game-downloads"
                                type="number"
                                min="0"
                                step="1"
                                value={form.monthly_downloads}
                                onChange={(e) => updateField('monthly_downloads', e.target.value)}
                                placeholder="e.g. 85000"
                                disabled={isSubmitting}
                                className={inputClassName(Boolean(fieldErrors.monthly_downloads))}
                            />
                            {fieldErrors.monthly_downloads && (
                                <p className="mt-1 text-xs text-red-400">
                                    {fieldErrors.monthly_downloads}
                                </p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <label
                                htmlFor="game-rating"
                                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Average Rating (0 - 5) <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="game-rating"
                                type="number"
                                min="0"
                                max="5"
                                step="0.01"
                                value={form.average_rating}
                                onChange={(e) => updateField('average_rating', e.target.value)}
                                placeholder="e.g. 4.85"
                                disabled={isSubmitting}
                                className={inputClassName(Boolean(fieldErrors.average_rating))}
                            />
                            {fieldErrors.average_rating && (
                                <p className="mt-1 text-xs text-red-400">
                                    {fieldErrors.average_rating}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
                        >
                            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {isEditMode ? 'Save Changes' : 'Add Game'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
