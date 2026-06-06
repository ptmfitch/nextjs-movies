import type { Filter } from "mongodb";

import { getMongoCollectionName } from "@/lib/env";
import { getDb } from "@/lib/mongodb";
import { escapeRegex } from "@/lib/regex";
import type { Movie, MovieDocument } from "@/types/movie";

export function buildTitleSearchFilter(query: string): Filter<MovieDocument> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {};
  }

  return {
    title: { $regex: escapeRegex(trimmed), $options: "i" },
  };
}

function serializeMovie(doc: MovieDocument): Movie {
  return {
    _id: doc._id.toString(),
    plot: doc.plot ?? "",
    genres: doc.genres ?? [],
    runtime: doc.runtime ?? 0,
    cast: doc.cast ?? [],
    poster: doc.poster ?? "",
    title: doc.title ?? "Untitled",
    fullplot: doc.fullplot,
    languages: doc.languages ?? [],
    released: doc.released ?? new Date(0),
    directors: doc.directors ?? [],
    rated: doc.rated ?? "",
    awards: doc.awards ?? { wins: 0, nominations: 0, text: "" },
    lastupdated: doc.lastupdated ?? "",
    year: doc.year ?? 0,
    imdb: doc.imdb ?? { rating: 0, votes: 0, id: 0 },
    countries: doc.countries ?? [],
    type: doc.type ?? "",
    tomatoes: doc.tomatoes ?? {
      viewer: { rating: 0, numReviews: 0, meter: 0 },
      fresh: 0,
      critic: { rating: 0, numReviews: 0, meter: 0 },
      rotten: 0,
      lastUpdated: new Date(0),
    },
    num_mflix_comments: doc.num_mflix_comments ?? 0,
  };
}

export async function listMovies(limit = 24): Promise<Movie[]> {
  const db = await getDb();
  const docs = await db
    .collection<MovieDocument>(getMongoCollectionName())
    .find({ poster: { $exists: true, $ne: "" } })
    .sort({ year: -1 })
    .limit(limit)
    .toArray();

  return docs.map(serializeMovie);
}

export async function searchMoviesByTitle(
  query: string,
  limit = 24,
): Promise<Movie[]> {
  const filter = buildTitleSearchFilter(query);
  if (Object.keys(filter).length === 0) {
    return listMovies(limit);
  }

  const db = await getDb();
  const docs = await db
    .collection<MovieDocument>(getMongoCollectionName())
    .find(filter)
    .sort({ "imdb.rating": -1 })
    .limit(limit)
    .toArray();

  return docs.map(serializeMovie);
}
