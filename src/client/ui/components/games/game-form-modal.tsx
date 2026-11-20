import type { GameFormErrors, GameFormValues } from '@/client/domain/game';
import { Button } from '@/client/ui/components/primitives/button';
import { Input } from '@/client/ui/components/primitives/input';
import { Modal } from '@/client/ui/components/primitives/modal';
import { Select } from '@/client/ui/components/primitives/select';

type GameFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  values: GameFormValues;
  errors: GameFormErrors;
  /** Error that isn't about one field (e.g. the server is unreachable). */
  formError?: string;
  isSubmitting: boolean;
  genres: readonly string[];
  onChange: (field: keyof GameFormValues, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const FORM_ID = 'game-form';

export function GameFormModal({
  open,
  mode,
  values,
  errors,
  formError,
  isSubmitting,
  genres,
  onChange,
  onSubmit,
  onClose,
}: GameFormModalProps) {
  const field = (name: keyof GameFormValues) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(name, event.target.value),
  });

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Add game' : 'Edit game'}
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : mode === 'create' ? 'Add game' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        // The shared Zod schema validates; browser bubbles would duplicate its messages.
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <Input label="Title" data-autofocus maxLength={100} {...field('title')} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Developer" maxLength={100} {...field('developer')} />
        </div>
        <Select label="Genre" placeholder="Choose a genre" options={genres} {...field('genre')} />
        <Input
          label="Average rating"
          inputMode="decimal"
          hint="0 to 5, one decimal"
          {...field('averageRating')}
        />
        <Input
          label="Revenue last month (USD)"
          inputMode="numeric"
          hint="Whole dollars"
          {...field('monthlyRevenueUsd')}
        />
        <Input label="Downloads last month" inputMode="numeric" {...field('monthlyDownloads')} />
        {formError && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
