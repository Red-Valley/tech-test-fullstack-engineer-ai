interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
  return (
    <section aria-label="Suggested questions" className="flex h-full flex-col items-center justify-center gap-4">
      <p className="text-muted">Ask about the game catalog</p>
      <ul className="flex w-full flex-col gap-2">
        {prompts.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onSelect(prompt)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
