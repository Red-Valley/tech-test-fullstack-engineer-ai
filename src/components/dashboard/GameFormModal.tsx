'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Game } from '@/lib/types';

interface GameFormModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function GameFormModal({ isOpen, game, onClose, onSuccess }: GameFormModalProps) {
  const isEditing = Boolean(game);

  const [title, setTitle] = useState('');
  const [developer, setDeveloper] = useState('');
  const [genre, setGenre] = useState('');
  const [revenue, setRevenue] = useState('');
  const [downloads, setDownloads] = useState('');
  const [rating, setRating] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync state with incoming game prop on open
  useEffect(() => {
    if (isOpen) {
      if (game) {
        setTitle(game.title);
        setDeveloper(game.developer);
        setGenre(game.genre);
        setRevenue(game.monthly_revenue_usd.toString());
        setDownloads(game.monthly_downloads.toString());
        setRating(game.average_rating.toString());
      } else {
        setTitle('');
        setDeveloper('');
        setGenre('');
        setRevenue('');
        setDownloads('');
        setRating('');
      }
      setFormError(null);
      setFieldErrors({});

      // Auto-focus first input for accessibility
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, game]);

  // Keyboard accessibility: close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Client-side quick check
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Title is required';
    if (!developer.trim()) errors.developer = 'Developer is required';
    if (!genre.trim()) errors.genre = 'Genre is required';
    if (revenue === '' || Number(revenue) < 0) errors.revenue = 'Monthly revenue must be >= 0';
    if (downloads === '' || Number(downloads) < 0 || !Number.isInteger(Number(downloads))) {
      errors.downloads = 'Monthly downloads must be an integer >= 0';
    }
    if (rating === '' || Number(rating) < 0 || Number(rating) > 5) {
      errors.rating = 'Rating must be between 0.0 and 5.0';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        developer: developer.trim(),
        genre: genre.trim(),
        monthly_revenue_usd: Number(revenue),
        monthly_downloads: Number(downloads),
        average_rating: Number(rating),
      };

      const url = isEditing && game ? `/api/games/${game.id}` : '/api/games';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.details && Array.isArray(json.details)) {
          const apiErrors: Record<string, string> = {};
          for (const issue of json.details) {
            const field = issue.path?.[0];
            if (field) apiErrors[field] = issue.message;
          }
          setFieldErrors(apiErrors);
        }
        throw new Error(json.error || 'Failed to save game');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 id="game-modal-title" className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Game Record' : 'Add New Game to Catalog'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Error Banner */}
        {formError && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
            {formError}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="field-title" className="block text-xs font-medium text-slate-300 mb-1">
              Game Title *
            </label>
            <input
              id="field-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Celeste"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {fieldErrors.title && (
              <p className="text-xs text-rose-400 mt-1">{fieldErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-developer" className="block text-xs font-medium text-slate-300 mb-1">
                Developer *
              </label>
              <input
                id="field-developer"
                type="text"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="e.g. Maddy Makes Games"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {fieldErrors.developer && (
                <p className="text-xs text-rose-400 mt-1">{fieldErrors.developer}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-genre" className="block text-xs font-medium text-slate-300 mb-1">
                Genre *
              </label>
              <input
                id="field-genre"
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Platformer"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {fieldErrors.genre && (
                <p className="text-xs text-rose-400 mt-1">{fieldErrors.genre}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="field-revenue" className="block text-xs font-medium text-slate-300 mb-1">
                Monthly Revenue ($) *
              </label>
              <input
                id="field-revenue"
                type="number"
                min="0"
                step="1"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              {fieldErrors.monthly_revenue_usd && (
                <p className="text-xs text-rose-400 mt-1">{fieldErrors.monthly_revenue_usd}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-downloads" className="block text-xs font-medium text-slate-300 mb-1">
                Monthly Downloads *
              </label>
              <input
                id="field-downloads"
                type="number"
                min="0"
                step="1"
                value={downloads}
                onChange={(e) => setDownloads(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              {fieldErrors.monthly_downloads && (
                <p className="text-xs text-rose-400 mt-1">{fieldErrors.monthly_downloads}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-rating" className="block text-xs font-medium text-slate-300 mb-1">
                Rating (0.0 - 5.0) *
              </label>
              <input
                id="field-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="4.5"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              {fieldErrors.average_rating && (
                <p className="text-xs text-rose-400 mt-1">{fieldErrors.average_rating}</p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Game'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
