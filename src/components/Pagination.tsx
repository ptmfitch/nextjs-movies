"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { buildMovieListUrl, readMovieListParams } from "@/lib/movie-list-url";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
}

export function Pagination({ page, total, pageSize }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { q, sort } = readMovieListParams(searchParams);

  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  function navigateToPage(nextPage: number) {
    router.push(
      buildMovieListUrl({
        q,
        sort,
        page: nextPage,
      }),
    );
  }

  return (
    <nav
      aria-label="Movie pagination"
      className="mt-10 flex items-center justify-center gap-4"
    >
      <button
        type="button"
        onClick={() => navigateToPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-secondary transition hover:border-muted hover:text-foreground disabled:cursor-not-allowed disabled:border-border disabled:text-disabled"
      >
        Previous
      </button>
      <p className="text-sm text-muted">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        onClick={() => navigateToPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-secondary transition hover:border-muted hover:text-foreground disabled:cursor-not-allowed disabled:border-border disabled:text-disabled"
      >
        Next
      </button>
    </nav>
  );
}
