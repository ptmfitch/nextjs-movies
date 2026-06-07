import { Suspense } from "react";

import { MovieGrid } from "@/components/MovieGrid";
import { MovieListMeta } from "@/components/MovieListMeta";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { SortSelect } from "@/components/SortSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  MOVIES_PAGE_SIZE,
  buildMoviesRange,
  listMovies,
  parseMoviePage,
  parseMovieSort,
  searchMoviesByTitle,
} from "@/lib/movies";
import type { Movie } from "@/types/movie";

interface HomeProps {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { q, page: pageParam, sort: sortParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = parseMoviePage(pageParam);
  const sort = parseMovieSort(sortParam);

  let movies: Movie[] = [];
  let total = 0;
  let currentPage = page;
  let pageSize = MOVIES_PAGE_SIZE;
  let errorMessage: string | null = null;

  try {
    const result = query
      ? await searchMoviesByTitle(query, { page, sort })
      : await listMovies({ page, sort });

    movies = result.movies;
    total = result.total;
    currentPage = result.page;
    pageSize = result.pageSize;
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load movies from MongoDB.";
  }

  const range = buildMoviesRange({
    page: currentPage,
    pageSize,
    total,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium tracking-[0.2em] text-accent">
                Nextjs-Movies
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-heading sm:text-5xl">
                Movie Browser
              </h1>
              <p className="mt-3 max-w-2xl text-base text-muted">
                Browse movie posters and search by title.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <Suspense
            fallback={
              <div className="h-12 w-full max-w-2xl animate-pulse rounded-xl bg-surface-muted" />
            }
          >
            <SearchBar />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-8">
            <h2 className="text-lg font-semibold text-destructive">
              Database connection error
            </h2>
            <p className="mt-2 text-sm text-destructive-muted">{errorMessage}</p>
            <p className="mt-4 text-sm text-muted">
              Copy <code className="text-secondary">.env.local.example</code> to{" "}
              <code className="text-secondary">.env.local</code> and set{" "}
              <code className="text-secondary">MONGODB_URI</code>.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <MovieListMeta
                start={range.start}
                end={range.end}
                total={range.total}
                query={query}
              />
              <Suspense
                fallback={
                  <div className="h-11 w-48 animate-pulse rounded-xl bg-surface-muted" />
                }
              >
                <SortSelect />
              </Suspense>
            </div>
            <MovieGrid movies={movies} query={query} />
            <Suspense fallback={null}>
              <Pagination
                page={currentPage}
                total={total}
                pageSize={pageSize}
              />
            </Suspense>
          </>
        )}
      </main>
    </div>
  );
}
