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
      <label htmlFor="movie-sort" className="text-sm font-medium text-zinc-400">
        Sort by
      </label>
      <select
        id="movie-sort"
        value={sort}
        onChange={handleChange}
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
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
