import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const REMARK_PLUGINS = [remarkGfm];

const COMPONENTS: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-5">{children}</ol>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-brand underline">
      {children}
    </a>
  ),
  // A model-written image would make the browser request any URL it chooses.
  img: () => null,
  code: ({ children }) => <code className="rounded bg-background px-1 font-mono text-sm">{children}</code>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm tabular-nums">{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th style={style} className="border-b border-border px-3 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border-b border-border px-3 py-1.5">
      {children}
    </td>
  ),
};

// Raw HTML stays disabled (no rehype-raw): this text comes from a model reading catalog data.
export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
      {text}
    </ReactMarkdown>
  );
}
