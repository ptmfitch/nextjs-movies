"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";

import { buildMovieListUrl, readMovieListParams } from "@/lib/movie-list-url";
import type { MovieSort } from "@/lib/movie-params";

const SORT_OPTIONS: { value: MovieSort; label: string }[] = [
  { value: "year-desc", label: "Year (newest)" },
  { value: "year-asc", label: "Year (oldest)" },
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "title-desc", label: "Title (Z–A)" },
];

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { q, sort } = readMovieListParams(searchParams);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    router.push(
      buildMovieListUrl({
        q,
        sort: event.target.value as MovieSort,
        page: 1,
      }),
    );
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="movie-sort" className="text-sm font-medium text-muted">
        Sort by
      </label>
      <select
        id="movie-sort"
        value={sort}
        onChange={handleChange}
        className="rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-ring"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
