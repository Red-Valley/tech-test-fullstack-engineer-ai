type SuggestionChipsProps = {
  suggestions: readonly string[];
  onPick: (suggestion: string) => void;
  disabled: boolean;
};

export function SuggestionChips({ suggestions, onPick, disabled }: SuggestionChipsProps) {
  return (
    <ul aria-label="Example questions" className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <li key={suggestion}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion)}
            className="rounded-full border border-border px-3 py-1 text-left text-xs text-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-50"
          >
            {suggestion}
          </button>
        </li>
      ))}
    </ul>
  );
}
