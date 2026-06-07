"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-8">
        <h1 className="text-lg font-semibold text-destructive">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-destructive-muted">
          {error.message || "An unexpected error occurred while loading movies."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
