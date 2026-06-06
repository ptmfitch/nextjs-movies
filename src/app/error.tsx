"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-8">
        <h1 className="text-lg font-semibold text-red-200">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-red-100/80">
          {error.message || "An unexpected error occurred while loading movies."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
