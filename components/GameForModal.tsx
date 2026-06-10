import { Loader2, X } from "lucide-react";

export type GameFormState = {
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: string;
  monthly_downloads: string;
  average_rating: string;
};

type Field = {
  label: string;
  field: keyof GameFormState;
  type: string;
  disabled?: boolean;
};

type GameFormModalProps = {
  title: string;
  description: string;
  formState: GameFormState;
  isSubmitting: boolean;
  submitLabel: string;
  error: string | null;
  fields: Field[];
  onChange: (field: keyof GameFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function GameFormModal({
  title,
  description,
  formState,
  isSubmitting,
  submitLabel,
  error,
  fields,
  onChange,
  onSubmit,
  onClose,
}: GameFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ label, field, type, disabled }) => (
              <label key={field} className="text-sm text-slate-300">
                <span className="mb-2 flex items-center gap-2">
                  {label}
                  {disabled && (
                    <span className="text-[10px] uppercase tracking-widest text-slate-500">
                        Not editable
                    </span>
                  )}
                </span>
                <input
                  required
                  type={type}
                  disabled={disabled}
                  step={field === "average_rating" ? "0.1" : undefined}
                  min={field === "average_rating" ? "0" : undefined}
                  max={field === "average_rating" ? "5" : undefined}
                  value={formState[field]}
                  onChange={(e) => onChange(field, e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 outline-none ring-0 disabled:cursor-not-allowed disabled:opacity-40"
                />
              </label>
            ))}
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {submitLabel}...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}