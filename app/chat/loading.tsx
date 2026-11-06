// Without this, /chat would inherit the dashboard skeleton from app/loading.tsx.
export default function Loading() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
      <p role="status" className="text-sm text-muted">
        Loading…
      </p>
    </main>
  );
}
