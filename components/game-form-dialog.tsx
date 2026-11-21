"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/games/schema";

type FieldName = "title" | "developer" | "genre" | "monthly_revenue_usd" | "monthly_downloads" | "average_rating";
type Errors = Partial<Record<FieldName | "form", string>>;

const FIELDS: { name: FieldName; label: string; type: "text" | "number"; attrs?: Record<string, string | number> }[] = [
  { name: "title", label: "Title", type: "text" },
  { name: "developer", label: "Developer", type: "text" },
  { name: "genre", label: "Genre", type: "text" },
  // `step: "any"` because the API accepts any non-negative number: a game created over REST with a rating of
  // 4.25 must still be editable here.
  { name: "monthly_revenue_usd", label: "Monthly revenue (USD)", type: "number", attrs: { min: 0, step: "any" } },
  { name: "monthly_downloads", label: "Monthly downloads", type: "number", attrs: { min: 0, step: 1 } },
  { name: "average_rating", label: "Average rating (0 to 5)", type: "number", attrs: { min: 0, max: 5, step: "any" } },
];

const NUMBER_FIELDS: FieldName[] = ["monthly_revenue_usd", "monthly_downloads", "average_rating"];

type Props = {
  /** The game being edited, or `null` to create a new one. */
  game: Game | null;
  genres: string[];
  onClose: () => void;
  /** Called after the API accepted the change. */
  onSaved: () => void;
};

export function GameFormDialog({ game, genres, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<FieldName, string>>({
    title: game?.title ?? "",
    developer: game?.developer ?? "",
    genre: game?.genre ?? "",
    monthly_revenue_usd: game ? String(game.monthly_revenue_usd) : "",
    monthly_downloads: game ? String(game.monthly_downloads) : "",
    average_rating: game ? String(game.average_rating) : "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  // A native <dialog> gives focus trapping and Escape handling for free.
  useEffect(() => {
    // React Strict Mode runs effects twice in development: do not open an already open dialog.
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = Object.fromEntries(
      FIELDS.map(({ name }) => [name, NUMBER_FIELDS.includes(name) ? Number(values[name]) : values[name]]),
    );
    try {
      const response = await fetch(game ? `/api/games/${game.id}` : "/api/games", {
        method: game ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        // Closing the native dialog returns keyboard focus to the button that opened it.
        dialogRef.current?.close();
        onSaved();
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        issues?: { path: (string | number)[]; message: string }[];
      } | null;
      const next: Errors = {};
      for (const issue of body?.issues ?? []) {
        const field = issue.path[0] as FieldName | undefined;
        if (field && !next[field]) next[field] = issue.message;
      }
      if (response.status === 409) next.title = body?.error ?? "A game with this title already exists";
      if (Object.keys(next).length === 0) next.form = body?.error ?? `Request failed (${response.status})`;
      setErrors(next);
    } catch {
      setErrors({ form: "Could not reach the server. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <form onSubmit={submit} className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900">{game ? "Edit game" : "Add game"}</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map(({ name, label, type, attrs }) => (
            <div key={name} className={name === "title" ? "sm:col-span-2" : undefined}>
              <label htmlFor={`field-${name}`} className="mb-1 block text-xs font-medium text-slate-700">
                {label}
              </label>
              <input
                id={`field-${name}`}
                name={name}
                type={type}
                required
                value={values[name]}
                onChange={(event) => setValues((prev) => ({ ...prev, [name]: event.target.value }))}
                list={name === "genre" ? "genre-options" : undefined}
                aria-invalid={errors[name] ? true : undefined}
                aria-describedby={errors[name] ? `error-${name}` : undefined}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 aria-invalid:border-red-500"
                {...attrs}
              />
              {errors[name] && (
                <p id={`error-${name}`} className="mt-1 text-xs text-red-600">
                  {errors[name]}
                </p>
              )}
            </div>
          ))}
        </div>
        <datalist id="genre-options">
          {genres.map((genre) => (
            <option key={genre} value={genre} />
          ))}
        </datalist>

        {errors.form && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {errors.form}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? "Saving..." : game ? "Save changes" : "Add game"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
