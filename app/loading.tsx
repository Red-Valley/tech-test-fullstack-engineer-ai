export default function Loading() {
  return (
    <main aria-busy="true" className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 lg:px-8">
      <p className="sr-only" role="status">
        Loading…
      </p>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-high motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="h-20 animate-pulse rounded-xl bg-surface-high motion-reduce:animate-none" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-surface-high motion-reduce:animate-none" />
    </main>
  );
}
