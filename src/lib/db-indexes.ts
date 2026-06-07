import type {
  CreateIndexesOptions,
  IndexDirection,
  SearchIndexDescription,
} from "mongodb";

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
];

export const MOVIE_SEARCH_INDEX_NAME = "movies_title_search";

/**
 * Atlas Search index for title search in movies.ts.
 *
 * The primary title mapping supports normal tokenized and fuzzy title search.
 * The keyword multi-analyzer keeps the whole title as one lower-cased token so
 * Lucene wildcard queries can bridge separators, e.g. "starwars" -> "Star Wars".
 */
export const MOVIE_SEARCH_INDEX: SearchIndexDescription & { name: string } = {
  name: MOVIE_SEARCH_INDEX_NAME,
  type: "search",
  definition: {
    analyzers: [
      {
        name: "caseInsensitiveKeyword",
        charFilters: [],
        tokenizer: {
          type: "keyword",
        },
        tokenFilters: [
          {
            type: "lowercase",
          },
        ],
      },
    ],
    mappings: {
      dynamic: false,
      fields: {
        poster: {
          type: "string",
          analyzer: "lucene.keyword",
        },
        title: {
          type: "string",
          analyzer: "lucene.standard",
          multi: {
            keyword: {
              type: "string",
              analyzer: "caseInsensitiveKeyword",
            },
          },
        },
      },
    },
  },
};
