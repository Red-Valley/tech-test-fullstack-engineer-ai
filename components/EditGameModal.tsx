import { GameFormModal, type GameFormState } from "./GameForModal";

const EDIT_FIELDS = [
  { label: "Title", field: "title" as const, type: "text", disabled: true }, // ✅ no editable
  { label: "Developer", field: "developer" as const, type: "text" },
  { label: "Genre", field: "genre" as const, type: "text" },
  { label: "Revenue", field: "monthly_revenue_usd" as const, type: "number" },
  { label: "Downloads", field: "monthly_downloads" as const, type: "number" },
  { label: "Rating", field: "average_rating" as const, type: "number" },
];

type EditGameModalProps = {
  formState: GameFormState;
  isEditing: boolean;
  error: string | null;
  onChange: (field: keyof GameFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function EditGameModal(props: EditGameModalProps) {
  return (
    <GameFormModal
      title="Edit Game"
      description="Modify the game's details. The title cannot be changed."
      submitLabel="Save Changes"
      fields={EDIT_FIELDS}
      {...props}
      isSubmitting={props.isEditing}
    />
  );
}