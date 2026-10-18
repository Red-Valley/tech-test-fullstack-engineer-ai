"use client";

import { ArrowLeft, Trash, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDashboard } from "@/components/DashboardShell";
import { flattenFieldErrors, gameInputSchema, type FieldErrors, type Game, type GameInput } from "@/lib/db/schema";

type Field = { name: keyof GameInput; label: string; step?: string };

const FIELDS: Field[] = [
  { name: "title", label: "Title" },
  { name: "developer", label: "Developer" },
  { name: "genre", label: "Genre" },
  { name: "monthly_revenue_usd", label: "Monthly revenue (USD)", step: "0.01" },
  { name: "monthly_downloads", label: "Monthly downloads", step: "1" },
  { name: "average_rating", label: "Average rating (0–5)", step: "0.1" },
];

type Values = Record<keyof GameInput, string>;

function toValues(game?: Game): Values {
  return Object.fromEntries(FIELDS.map(({ name }) => [name, game ? String(game[name]) : ""])) as Values;
}

/** Blank numeric inputs become undefined so the schema reports them with the field's rule. */
function toInput(values: Values): Record<string, unknown> {
  const toNumber = (value: string) => (value.trim() === "" ? undefined : Number(value));
  return {
    title: values.title,
    developer: values.developer,
    genre: values.genre,
    monthly_revenue_usd: toNumber(values.monthly_revenue_usd),
    monthly_downloads: toNumber(values.monthly_downloads),
    average_rating: toNumber(values.average_rating),
  };
}

/** Add/edit form shown in the rail in place of the assistant. Keyed by game, so switching resets it. */
export function GameEditor({ game }: { game?: Game }) {
  const router = useRouter();
  const { closeEditor, requestDelete, toast } = useDashboard();
  const [values, setValues] = useState<Values>(() => toValues(game));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function change(name: keyof GameInput, value: string) {
    setValues({ ...values, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = gameInputSchema.safeParse(toInput(values));
    if (!parsed.success) {
      setErrors(flattenFieldErrors(parsed.error));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(game ? `/api/games/${game.id}` : "/api/games", {
        method: game ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.ok) {
        closeEditor();
        router.refresh();
        toast(`${game ? "Saved" : "Added"} ${parsed.data.title}`);
        return;
      }
      if (response.status === 404) {
        closeEditor();
        router.refresh();
        toast("This game no longer exists.");
        return;
      }
      const { error } = await response.json();
      setErrors(error.fields ?? {});
      setFormError(error.fields ? null : error.message);
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const title = game ? `Edit ${game.title}` : "Add game";

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col" aria-label={title}>
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-2.5 pr-12 xl:pr-3">
        <button type="button" onClick={closeEditor} aria-label="Back to assistant" className="btn btn-ghost size-[30px] shrink-0 p-0">
          <ArrowLeft size={15} aria-hidden />
        </button>
        <h2 className="truncate text-base">{title}</h2>
      </div>
      <div className="rule-fade mx-4" />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {FIELDS.map(({ name, label, step }, index) => {
          const message = errors[name]?.[0];
          const id = `game-${name}`;
          return (
            <div key={name} className="flex flex-col gap-[5px]">
              <label htmlFor={id} className="text-xs text-text/70">
                {label}
              </label>
              <input
                id={id}
                name={name}
                type={step ? "number" : "text"}
                step={step}
                min={step ? 0 : undefined}
                autoFocus={index === 0}
                value={values[name]}
                onChange={(event) => change(name, event.target.value)}
                aria-invalid={Boolean(message)}
                aria-describedby={message ? `${id}-error` : undefined}
                className={`input bg-bg tabular-nums ${message ? "border-accent" : ""}`}
              />
              {message && (
                <p id={`${id}-error`} className="flex items-center gap-1.5 text-xs text-accent-300">
                  <WarningCircle size={13} aria-hidden />
                  {message}
                </p>
              )}
            </div>
          );
        })}
        {formError && <p className="text-xs text-accent-300">{formError}</p>}
      </div>

      <div className="flex items-center gap-1.5 px-4 pt-3 pb-4">
        {game && (
          <button type="button" onClick={() => requestDelete(game)} className="btn btn-ghost px-2 text-[13px] text-neutral-300">
            <Trash size={14} aria-hidden />
            Delete
          </button>
        )}
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={closeEditor} className="btn btn-secondary px-3 py-1.5 text-[13px]">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary px-3 py-1.5 text-[13px]">
            {saving ? "Saving…" : game ? "Save changes" : "Add game"}
          </button>
        </div>
      </div>
    </form>
  );
}
