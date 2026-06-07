import { PosterImage } from "@/components/PosterImage";
import type { Movie } from "@/types/movie";

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const castPreview = movie.cast.slice(0, 3).join(", ");
  const genres = movie.genres.slice(0, 3).join(" · ");
  const rating = movie.imdb.rating > 0 ? movie.imdb.rating.toFixed(1) : "N/A";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface/70 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-accent/10">
      <div className="aspect-[2/3] overflow-hidden bg-surface-muted">
        {movie.poster ? (
          <PosterImage
            src={movie.poster}
            alt={`${movie.title} poster`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No poster
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-tight text-heading">
            {movie.title}
          </h3>
          <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-soft">
            {rating}
          </span>
        </div>
        <p className="text-sm text-muted">
          {movie.year}
          {movie.runtime > 0 ? ` · ${movie.runtime} min` : ""}
          {genres ? ` · ${genres}` : ""}
        </p>
        {castPreview && (
          <p className="line-clamp-2 text-sm text-muted">{castPreview}</p>
        )}
      </div>
    </article>
  );
}
