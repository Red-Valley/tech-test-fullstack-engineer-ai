"use client";

import { useId, useState, type ComponentProps, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { ApiRequestError, createGame, updateGame } from "@/lib/games/client";
import { gameInputSchema, MAX_RATING, type Game } from "@/lib/games/schema";

type FieldName = "title" | "developer" | "genre" | "monthly_revenue_usd" | "monthly_downloads" | "average_rating";
type Values = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const EMPTY: Values = {
  title: "",
  developer: "",
  genre: "",
  monthly_revenue_usd: "",
  monthly_downloads: "",
  average_rating: "",
};

const FIELD_ORDER = Object.keys(EMPTY) as FieldName[];
const isFieldName = (name: string): name is FieldName => (FIELD_ORDER as string[]).includes(name);

const toValues = (game: Game): Values => ({
  title: game.title,
  developer: game.developer,
  genre: game.genre,
  monthly_revenue_usd: String(game.monthly_revenue_usd),
  monthly_downloads: String(game.monthly_downloads),
  average_rating: String(game.average_rating),
});

/** Inputs are strings while typing; an empty box is "missing", anything else is parsed as a number. */
function toCandidate(values: Values) {
  const number = (text: string) => (text.trim() === "" ? undefined : Number(text));
  return {
    title: values.title,
    developer: values.developer,
    genre: values.genre,
    monthly_revenue_usd: number(values.monthly_revenue_usd),
    monthly_downloads: number(values.monthly_downloads),
    average_rating: number(values.average_rating),
  };
}

interface GameFormDialogProps {
  /** The game being edited, or null to create a new one. */
  game: Game | null;
  /** Existing genres, offered as suggestions (genre stays free text). */
  genres: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function GameFormDialog({ game, genres, onClose, onSaved }: GameFormDialogProps) {
  const [values, setValues] = useState<Values>(game ? toValues(game) : EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const idPrefix = useId();
  const genreListId = `${idPrefix}-genres`;

  function setValue(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function focusField(form: HTMLFormElement, name: FieldName | undefined) {
    if (name) (form.elements.namedItem(name) as HTMLInputElement | null)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError(null);

    const parsed = gameInputSchema.safeParse(toCandidate(values));
    if (!parsed.success) {
      const found: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const name = String(issue.path[0]);
        if (isFieldName(name) && !found[name]) found[name] = issue.message;
      }
      setErrors(found);
      focusField(form, FIELD_ORDER.find((name) => found[name]));
      return;
    }

    setErrors({});
    setPending(true);
    try {
      if (game) {
        await updateGame(game.id, parsed.data);
        onSaved(`Saved “${parsed.data.title}”`);
      } else {
        await createGame(parsed.data);
        onSaved(`Added “${parsed.data.title}”`);
      }
    } catch (error) {
      setPending(false);
      if (error instanceof ApiRequestError) {
        // Show the server's per-field problems (e.g. "title already exists") next to the right input.
        const fromServer: FieldErrors = {};
        for (const { field, message } of error.issues) {
          if (isFieldName(field) && !fromServer[field]) fromServer[field] = message;
        }
        setErrors(fromServer);
        setFormError(Object.keys(fromServer).length > 0 ? null : error.message);
        focusField(form, FIELD_ORDER.find((name) => fromServer[name]));
      } else {
        setFormError("Something went wrong while saving. Please try again.");
      }
    }
  }

  const field = (name: FieldName, label: string, extra: ComponentProps<"input"> = {}) => {
    const inputId = `${idPrefix}-${name}`;
    const error = errors[name];
    return (
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        <input
          id={inputId}
          name={name}
          value={values[name]}
          onChange={(event) => setValue(name, event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          disabled={pending}
          className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm disabled:bg-slate-50 ${
            error ? "border-rose-400" : "border-slate-300"
          }`}
          {...extra}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <Modal title={game ? `Edit ${game.title}` : "Add a game"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        {field("title", "Title", { autoComplete: "off" })}
        {field("developer", "Developer", { autoComplete: "off" })}
        {field("genre", "Genre", { list: genreListId, autoComplete: "off", placeholder: "e.g. Roguelike" })}
        <datalist id={genreListId}>
          {genres.map((genre) => (
            <option key={genre} value={genre} />
          ))}
        </datalist>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Short labels so all three stay on one line and the inputs line up. */}
          {field("monthly_revenue_usd", "Revenue (USD/mo)", { type: "number", inputMode: "decimal", step: "0.01", min: 0 })}
          {field("monthly_downloads", "Downloads/mo", { type: "number", inputMode: "numeric", step: 1, min: 0 })}
          {field("average_rating", `Rating (0–${MAX_RATING})`, { type: "number", inputMode: "decimal", step: "0.1", min: 0, max: MAX_RATING })}
        </div>

        {formError && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : game ? "Save changes" : "Add game"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
