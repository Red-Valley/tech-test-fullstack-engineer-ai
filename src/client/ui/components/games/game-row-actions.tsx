import { Button } from '@/client/ui/components/primitives/button';

type GameRowActionsProps = {
  title: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function GameRowActions({ title, onEdit, onDelete }: GameRowActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" aria-label={`Edit ${title}`} onClick={onEdit}>
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Delete ${title}`}
        className="hover:text-danger"
        onClick={onDelete}
      >
        Delete
      </Button>
    </div>
  );
}
