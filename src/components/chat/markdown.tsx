import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Styled with descendant selectors on the wrapper, so there is no per-element component mapping to maintain.
const styles = [
  "text-sm leading-relaxed text-slate-800",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_p]:my-2 [&_strong]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
  "[&_h1]:mt-3 [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold",
  "[&_a]:text-indigo-600 [&_a]:underline",
  "[&_code]:rounded [&_code]:bg-slate-200/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
  // A wide table scrolls on its own instead of stretching the bubble.
  "[&_table]:my-3 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse",
  "[&_th]:border-b [&_th]:border-slate-300 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold",
  "[&_td]:border-b [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-1.5",
].join(" ");

/** Renders the assistant's Markdown (including GFM tables). Raw HTML in the text is not rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className={styles}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
