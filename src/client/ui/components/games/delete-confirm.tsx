import { Button } from '@/client/ui/components/primitives/button';
import { Modal } from '@/client/ui/components/primitives/modal';

type DeleteConfirmProps = {
  open: boolean;
  gameTitle: string;
  isDeleting: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteConfirm({
  open,
  gameTitle,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  return (
    <Modal
      open={open}
      title="Delete game?"
      onClose={onCancel}
      busy={isDeleting}
      footer={
        <>
          {/* Focus lands on Cancel first, so Enter doesn't delete by accident. */}
          <Button variant="secondary" data-autofocus onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      <p className="text-sm">
        <span className="font-medium">{gameTitle}</span> will be removed from the catalog. This
        can&apos;t be undone.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
