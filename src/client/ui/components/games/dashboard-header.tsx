export function DashboardHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold">Indie Games Catalog</h1>
      <p className="text-sm text-muted">Revenue and downloads are for last month.</p>
    </header>
  );
}

export function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-semibold">
      {children}
    </h2>
  );
}
