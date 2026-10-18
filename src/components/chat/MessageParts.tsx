"use client";

import { Check } from "@phosphor-icons/react";
import { getToolName, isTextUIPart, isToolUIPart } from "ai";
import type { ChatMessage } from "@/lib/ai/agent";

type ToolPart = Extract<ChatMessage["parts"][number], { toolCallId: string }>;

const TOOL_LABELS: Record<string, { pending: string; done: string }> = {
  search_games: { pending: "Searching games", done: "Searched games" },
  rank_games: { pending: "Ranking games", done: "Ranked games" },
  count_games: { pending: "Counting games", done: "Counted games" },
  get_games: { pending: "Fetching games", done: "Fetched games" },
};

function describeInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  return Object.entries(input)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" · ");
}

function ToolChip({ part }: { part: ToolPart }) {
  const name = getToolName(part);
  const labels = TOOL_LABELS[name] ?? { pending: `Running ${name}`, done: `Ran ${name}` };
  const done = part.state === "output-available";
  const failed = part.state === "output-error";
  const details = failed ? part.errorText : describeInput(part.input);

  return (
    <div className="inline-flex max-w-full items-center gap-[7px] self-start rounded-sm border border-accent-700 px-[9px] py-[3px] text-[11px] text-accent-300">
      {done ? (
        <Check size={12} aria-hidden />
      ) : (
        !failed && (
          <span aria-hidden className="size-2.5 shrink-0 animate-spin rounded-full border-[1.5px] border-accent-700 border-t-accent-300 [animation-duration:.8s]" />
        )
      )}
      <span className="shrink-0 font-medium">{failed ? `${labels.pending} failed` : done ? labels.done : `${labels.pending}…`}</span>
      {details && <span className="truncate font-mono opacity-75">{details}</span>}
    </div>
  );
}

const Cursor = () => (
  <span
    aria-hidden
    className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-blink rounded-[1px] bg-accent shadow-[0_0_8px_var(--color-accent)]"
  />
);

/** Lookups as outlined chips, then the answer text; a blinking cursor while it streams. */
export function MessageParts({ message, streaming = false }: { message: ChatMessage; streaming?: boolean }) {
  const lastText = message.parts.findLastIndex((part) => isTextUIPart(part) && part.text.trim());
  return (
    <>
      {message.parts.map((part, index) => {
        if (isToolUIPart(part)) return <ToolChip key={part.toolCallId} part={part} />;
        if (isTextUIPart(part) && part.text.trim()) {
          return (
            <p key={index} className="text-[13px]/[1.6] whitespace-pre-wrap text-neutral-200 [text-wrap:pretty]">
              {part.text}
              {streaming && index === lastText && <Cursor />}
            </p>
          );
        }
        return null;
      })}
    </>
  );
}
