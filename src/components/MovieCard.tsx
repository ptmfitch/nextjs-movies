import type { Movie } from "@/types/movie";

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const castPreview = movie.cast.slice(0, 3).join(", ");
  const genres = movie.genres.slice(0, 3).join(" · ");
  const rating = movie.imdb.rating > 0 ? movie.imdb.rating.toFixed(1) : "N/A";

  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-amber-400/10">
      <div className="aspect-[2/3] overflow-hidden bg-zinc-800">
        {movie.poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- posters come from many external hosts
          <img
            src={movie.poster}
            alt={`${movie.title} poster`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No poster
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-tight text-white">
            {movie.title}
          </h2>
          <span className="shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
            {rating}
          </span>
        </div>
        <p className="text-sm text-zinc-400">
          {movie.year}
          {movie.runtime > 0 ? ` · ${movie.runtime} min` : ""}
          {genres ? ` · ${genres}` : ""}
        </p>
        {castPreview && (
          <p className="line-clamp-2 text-sm text-zinc-500">{castPreview}</p>
        )}
      </div>
    </article>
  );
}
