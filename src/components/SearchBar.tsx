"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { buildMovieListUrl, readMovieListParams } from "@/lib/movie-list-url";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { q: urlQuery, sort } = readMovieListParams(searchParams);
  const [draft, setDraft] = useState<string | null>(null);
  const query = draft ?? urlQuery;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();

    setDraft(null);
    router.push(
      buildMovieListUrl({
        q: trimmed || undefined,
        sort,
        page: 1,
      }),
    );
  }

  function handleClear() {
    setDraft(null);
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-3">
      <label htmlFor="movie-search" className="sr-only">
        Search movies by title
      </label>
      <input
        id="movie-search"
        type="search"
        value={query}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search by title..."
        className="flex-1 rounded-xl border border-border-strong bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
      >
        Search
      </button>
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="rounded-xl border border-border-strong px-4 py-3 text-sm font-medium text-secondary transition hover:border-muted hover:text-foreground"
        >
          Clear
        </button>
      )}
    </form>
  );
}
