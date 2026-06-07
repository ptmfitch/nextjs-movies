export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
            <div className="h-10 w-64 animate-pulse rounded bg-surface-muted" />
            <div className="h-5 w-96 max-w-full animate-pulse rounded bg-surface-muted" />
          </div>
          <div className="h-12 w-full max-w-2xl animate-pulse rounded-xl bg-surface-muted" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="h-7 w-48 animate-pulse rounded bg-surface-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-border bg-surface/70"
            >
              <div className="aspect-[2/3] animate-pulse bg-surface-muted" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-surface-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
