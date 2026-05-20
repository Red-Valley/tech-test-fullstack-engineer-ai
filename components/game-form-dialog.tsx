'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GENRES,
  gameCreateSchema,
  gameUpdateSchema,
  type Game,
  type GameCreate,
  type GameUpdate,
  type Genre,
} from '@/lib/games/schema';

type Mode = 'create' | 'edit';

interface FormState {
  title: string;
  developer: string;
  genre: Genre | '';
  monthly_revenue_usd: string;
  monthly_downloads: string;
  average_rating: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  developer: '',
  genre: '',
  monthly_revenue_usd: '',
  monthly_downloads: '',
  average_rating: '',
};

function gameToForm(game: Game): FormState {
  return {
    title: game.title,
    developer: game.developer,
    genre: game.genre,
    monthly_revenue_usd: String(game.monthly_revenue_usd),
    monthly_downloads: String(game.monthly_downloads),
    average_rating: String(game.average_rating),
  };
}

function formToInput(form: FormState): {
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number;
} {
  return {
    title: form.title.trim(),
    developer: form.developer.trim(),
    genre: form.genre,
    monthly_revenue_usd: Number(form.monthly_revenue_usd),
    monthly_downloads: Number(form.monthly_downloads),
    average_rating: Number(form.average_rating),
  };
}

export interface GameFormDialogProps {
  open: boolean;
  mode: Mode;
  initialGame: Game | null;
  onSubmit: (
    input: GameCreate | GameUpdate,
  ) => Promise<
    { success: true } | { success: false; fieldErrors: Record<string, string> }
  >;
  onClose: () => void;
}

export function GameFormDialog({
  open,
  mode,
  initialGame,
  onSubmit,
  onClose,
}: GameFormDialogProps): ReactElement {
  // The parent passes a unique `key` per modal session, so this component is
  // remounted whenever the mode or the edited game changes. That means the
  // useState initializers below run with the right initialGame each time, and
  // we avoid the React 19 "set-state-in-effect" anti-pattern of resetting form
  // state from a useEffect.
  const [form, setForm] = useState<FormState>(() =>
    mode === 'edit' && initialGame ? gameToForm(initialGame) : EMPTY_FORM,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (submitting) return;

    const schema = mode === 'create' ? gameCreateSchema : gameUpdateSchema;
    const result = schema.safeParse(formToInput(form));
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!errs[path]) errs[path] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    const res = await onSubmit(result.data);
    setSubmitting(false);
    if (!res.success) setFieldErrors(res.fieldErrors);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New game' : 'Edit game'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="title" label="Title" error={fieldErrors.title}>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              autoFocus
            />
          </Field>
          <Field id="developer" label="Developer" error={fieldErrors.developer}>
            <Input
              id="developer"
              value={form.developer}
              onChange={(e) => update('developer', e.target.value)}
            />
          </Field>
          <Field id="genre" label="Genre" error={fieldErrors.genre}>
            <Select
              value={form.genre || undefined}
              onValueChange={(v) => update('genre', v as Genre)}
            >
              <SelectTrigger id="genre" className="w-full">
                <SelectValue placeholder="Select a genre" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="revenue"
              label="Revenue (USD/mo)"
              error={fieldErrors.monthly_revenue_usd}
            >
              <Input
                id="revenue"
                type="number"
                min={0}
                value={form.monthly_revenue_usd}
                onChange={(e) => update('monthly_revenue_usd', e.target.value)}
              />
            </Field>
            <Field
              id="downloads"
              label="Downloads / mo"
              error={fieldErrors.monthly_downloads}
            >
              <Input
                id="downloads"
                type="number"
                min={0}
                step={1}
                value={form.monthly_downloads}
                onChange={(e) => update('monthly_downloads', e.target.value)}
              />
            </Field>
          </div>
          <Field
            id="rating"
            label="Average rating (0–5)"
            error={fieldErrors.average_rating}
          >
            <Input
              id="rating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={form.average_rating}
              onChange={(e) => update('average_rating', e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, error, children }: FieldProps): ReactElement {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
