import { MovieCard } from "@/components/MovieCard";
import type { Movie } from "@/types/movie";

interface MovieGridProps {
  movies: Movie[];
  query?: string;
}

export function MovieGrid({ movies, query }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-16 text-center">
        <p className="text-lg font-medium text-zinc-200">No movies found</p>
        <p className="mt-2 text-sm text-zinc-500">
          {query
            ? `No titles matched "${query}". Try another search.`
            : "No movies are available to display right now."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {movies.map((movie) => (
        <MovieCard key={movie._id} movie={movie} />
      ))}
    </div>
  );
}
