"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/games/types";
import { gameInputSchema } from "@/lib/games/schemas";

type FormStrings = {
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: string;
  monthly_downloads: string;
  average_rating: string;
};

type FieldErrors = Partial<Record<keyof FormStrings, string[]>>;

type Props = {
  mode: "create" | "edit";
  game?: Game;
  onClose: () => void;
  onSuccess: () => void;
};

const EMPTY_FORM: FormStrings = {
  title: "",
  developer: "",
  genre: "",
  monthly_revenue_usd: "",
  monthly_downloads: "",
  average_rating: "",
};

function gameToFormStrings(game: Game): FormStrings {
  return {
    title: game.title,
    developer: game.developer,
    genre: game.genre,
    monthly_revenue_usd: String(game.monthly_revenue_usd),
    monthly_downloads: String(game.monthly_downloads),
    average_rating: String(game.average_rating),
  };
}

export default function GameFormDialog({
  mode,
  game,
  onClose,
  onSuccess,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormStrings>(
    game ? gameToFormStrings(game) : EMPTY_FORM
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      title: form.title,
      developer: form.developer,
      genre: form.genre,
      monthly_revenue_usd: Number(form.monthly_revenue_usd),
      monthly_downloads: Number(form.monthly_downloads),
      average_rating: Number(form.average_rating),
    };

    const parsed = gameInputSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as FieldErrors);
      return;
    }

    setSaving(true);
    try {
      const url =
        mode === "edit" && game ? `/api/games/${game.id}` : "/api/games";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const json = (await res.json()) as {
          details?: { fieldErrors?: FieldErrors };
        };
        if (json.details?.fieldErrors) {
          setFieldErrors(json.details.fieldErrors);
        }
        return;
      }

      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      className="inset-x-0 top-auto bottom-0 m-0 w-full border-0 p-0 sm:inset-0 sm:m-auto sm:max-w-lg backdrop:bg-black/40"
    >
      <div className="flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[85dvh] sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {mode === "create" ? "Add game" : "Edit game"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-y-auto p-5"
        >
          <FormField
            label="Title"
            name="title"
            value={form.title}
            onChange={handleChange}
            errors={fieldErrors.title}
          />
          <FormField
            label="Developer"
            name="developer"
            value={form.developer}
            onChange={handleChange}
            errors={fieldErrors.developer}
          />
          <FormField
            label="Genre"
            name="genre"
            value={form.genre}
            onChange={handleChange}
            errors={fieldErrors.genre}
          />
          <FormField
            label="Monthly Revenue (USD)"
            name="monthly_revenue_usd"
            type="number"
            inputMode="numeric"
            value={form.monthly_revenue_usd}
            onChange={handleChange}
            errors={fieldErrors.monthly_revenue_usd}
          />
          <FormField
            label="Monthly Downloads"
            name="monthly_downloads"
            type="number"
            inputMode="numeric"
            value={form.monthly_downloads}
            onChange={handleChange}
            errors={fieldErrors.monthly_downloads}
          />
          <FormField
            label="Average Rating (0–5)"
            name="average_rating"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            max={5}
            value={form.average_rating}
            onChange={handleChange}
            errors={fieldErrors.average_rating}
          />

          <div className="mt-2 flex gap-3 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-sky-600 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

type FormFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: string[];
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  step?: number;
  min?: number;
  max?: number;
};

function FormField({
  label,
  name,
  value,
  onChange,
  errors,
  type = "text",
  inputMode,
  step,
  min,
  max,
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const hasError = errors && errors.length > 0;
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        step={step}
        min={min}
        max={max}
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError ? true : undefined}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus-visible:border-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 aria-[invalid]:border-red-400"
      />
      {hasError && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
