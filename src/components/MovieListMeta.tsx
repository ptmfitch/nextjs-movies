import { formatMoviesRangeText } from "@/lib/movie-params";

interface MovieListMetaProps {
  start: number;
  end: number;
  total: number;
  query?: string;
}

export function MovieListMeta({ start, end, total, query }: MovieListMetaProps) {
  const heading = query ? `Results for "${query}"` : "Latest movies";
  const rangeText = formatMoviesRangeText({ start, end, total });

  return (
    <div>
      <h2 className="text-xl font-semibold text-white">{heading}</h2>
      <p className="mt-1 text-sm text-zinc-500">{rangeText}</p>
    </div>
  );
}
