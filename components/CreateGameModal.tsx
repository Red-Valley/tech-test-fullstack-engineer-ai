import { GameFormModal, type GameFormState } from "./GameForModal";

const CREATE_FIELDS = [
  { label: "Title", field: "title" as const, type: "text" },
  { label: "Developer", field: "developer" as const, type: "text" },
  { label: "Genre", field: "genre" as const, type: "text" },
  { label: "Revenue", field: "monthly_revenue_usd" as const, type: "number" },
  { label: "Downloads", field: "monthly_downloads" as const, type: "number" },
  { label: "Rating", field: "average_rating" as const, type: "number" },
];

type CreateGameModalProps = {
  formState: GameFormState;
  isCreating: boolean;
  error: string | null;
  onChange: (field: keyof GameFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function CreateGameModal(props: CreateGameModalProps) {
  return (
    <GameFormModal
      title="Create New Game"
      description="Add a new title to the indie catalog."
      submitLabel="Save Game"
      fields={CREATE_FIELDS}
      {...props}
      isSubmitting={props.isCreating}
    />
  );
}