import type { CreateIndexesOptions, IndexDirection } from "mongodb";

export interface MovieIndexDefinition {
  key: Record<string, IndexDirection>;
  options: CreateIndexesOptions & { name: string };
}

/**
 * Indexes aligned with browse/search query patterns in movies.ts:
 * POSTER_FILTER plus sort fields from buildMovieSort().
 */
export const MOVIE_INDEXES: MovieIndexDefinition[] = [
  {
    key: { poster: 1, year: 1 },
    options: { name: "movies_poster_year_asc" },
  },
  {
    key: { poster: 1, title: 1 },
    options: { name: "movies_poster_title_asc" },
  },
  {
    key: { poster: 1, "imdb.rating": 1 },
    options: { name: "movies_poster_imdb_rating_asc" },
  },
];
