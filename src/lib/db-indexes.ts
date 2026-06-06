import type {
  CreateIndexesOptions,
  Document,
  IndexDirection,
  SearchIndexDescription,
} from "mongodb";

export interface MovieIndexDefinition {
  key: Record<string, IndexDirection>;
  options: CreateIndexesOptions & { name: string };
}

export interface MovieSearchIndexDefinition
  extends Omit<SearchIndexDescription, "name" | "definition"> {
  name: string;
  definition: Document;
}

export const MOVIE_TITLE_SEARCH_INDEX = "movies_title_search";

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
];

/**
 * Atlas Search index aligned with fuzzy title search in movies.ts.
 * The autocomplete mapping helps partial title input, while string supports
 * full-token fuzzy matching such as "matrx" -> "Matrix".
 */
export const MOVIE_SEARCH_INDEXES: MovieSearchIndexDefinition[] = [
  {
    name: MOVIE_TITLE_SEARCH_INDEX,
    type: "search",
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          title: [
            { type: "string" },
            {
              type: "autocomplete",
              tokenization: "nGram",
              minGrams: 2,
              maxGrams: 20,
              foldDiacritics: true,
            },
          ],
        },
      },
    },
  },
];
