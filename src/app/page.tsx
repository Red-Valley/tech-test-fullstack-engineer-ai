// Placeholder shell. Will render <DashboardContainer /> and <ChatContainer /> (ARCHITECTURE.md §3).
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <section aria-label="Dashboard" className="flex-1 p-6">
        <h1 className="text-2xl font-semibold">Indie Games Catalog</h1>
        <p className="mt-2 text-sm text-foreground/60">Dashboard goes here.</p>
      </section>
      <aside
        aria-label="Chat"
        className="border-t border-foreground/10 p-6 lg:w-[420px] lg:border-t-0 lg:border-l"
      >
        <p className="text-sm text-foreground/60">Chat goes here.</p>
      </aside>
    </main>
  );
}
