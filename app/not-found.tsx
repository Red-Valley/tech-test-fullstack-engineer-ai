import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found | Indie Games Dashboard' };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Page not found</h1>
      <Link
        href="/"
        className="rounded-lg text-brand underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        Back to the dashboard
      </Link>
    </main>
  );
}
