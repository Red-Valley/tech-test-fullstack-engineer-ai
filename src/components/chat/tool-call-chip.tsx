import type { ToolCallView } from "@/lib/chat/conversation";

const LABELS: Record<string, { running: string; done: string }> = {
  search_games: { running: "Looking up games…", done: "Looked up games" },
  aggregate_games: { running: "Crunching the numbers…", done: "Calculated totals" },
  compare_games: { running: "Comparing games…", done: "Compared games" },
};

function StatusIcon({ status }: { status: ToolCallView["status"] }) {
  if (status === "running") {
    return <span role="img" aria-label="In progress" className="size-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />;
  }
  if (status === "error") {
    return <span role="img" aria-label="Failed" className="font-bold text-rose-600">!</span>;
  }
  return <span role="img" aria-label="Done" className="font-bold text-emerald-600">✓</span>;
}

function Json({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 font-medium text-slate-500">{title}</div>
      <pre className="max-h-48 overflow-auto rounded bg-slate-50 p-2 text-[11px] leading-snug text-slate-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/**
 * A compact note that the assistant looked something up, expandable to the exact tool input and output.
 * It makes the tool use visible, and lets anyone check an answer against the data it came from.
 */
export function ToolCallChip({ call }: { call: ToolCallView }) {
  const label = LABELS[call.name] ?? { running: `Running ${call.name}…`, done: `Ran ${call.name}` };
  const text = call.status === "running" ? label.running : call.status === "error" ? `${label.done} (failed)` : label.done;

  return (
    <details className="group my-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-600">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 select-none [&::-webkit-details-marker]:hidden">
        <StatusIcon status={call.status} />
        <span className="font-medium">{text}</span>
        <span aria-hidden="true" className="ml-auto text-slate-400 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-100 px-3 py-2">
        <Json title="Input" value={call.input} />
        {call.output !== undefined && <Json title={call.status === "error" ? "Error" : "Result"} value={call.output} />}
      </div>
    </details>
  );
}
