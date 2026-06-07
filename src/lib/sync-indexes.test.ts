import { beforeEach, describe, expect, it, vi } from "vitest";

import { MOVIE_INDEXES, MOVIE_SEARCH_INDEX } from "@/lib/db-indexes";
import { getDb } from "@/lib/mongodb";
import {
  resetMovieIndexSyncState,
  syncMovieIndexes,
} from "@/lib/sync-indexes";

const mockCreateIndexes = vi.fn();
const mockCreateSearchIndex = vi.fn();
const mockDropIndex = vi.fn();
const mockListIndexes = vi.fn();
const mockListSearchIndexes = vi.fn();
const mockUpdateSearchIndex = vi.fn();
const mockCollection = vi.fn(() => ({
  createIndexes: mockCreateIndexes,
  createSearchIndex: mockCreateSearchIndex,
  dropIndex: mockDropIndex,
  listIndexes: mockListIndexes,
  listSearchIndexes: mockListSearchIndexes,
  updateSearchIndex: mockUpdateSearchIndex,
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getMongoCollectionName: () => "movies",
}));

describe("syncMovieIndexes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMovieIndexSyncState();
    mockCreateIndexes.mockResolvedValue([]);
    mockCreateSearchIndex.mockResolvedValue(MOVIE_SEARCH_INDEX.name);
    mockDropIndex.mockResolvedValue(undefined);
    mockUpdateSearchIndex.mockResolvedValue(undefined);
    mockListIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { name: "_id_" },
        { name: "movies_poster_year_asc" },
        { name: "movies_poster_year_desc" },
      ]),
    });
    mockListSearchIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    vi.mocked(getDb).mockResolvedValue({
      collection: mockCollection,
    } as never);
  });

  it("creates missing indexes and drops extras not in the manifest", async () => {
    const result = await syncMovieIndexes();

    expect(mockCollection).toHaveBeenCalledWith("movies");
    expect(mockCreateIndexes).toHaveBeenCalledWith(
      MOVIE_INDEXES.map(({ key, options }) => ({ key, ...options })),
    );
    expect(mockDropIndex).toHaveBeenCalledWith("movies_poster_year_desc");
    expect(mockDropIndex).not.toHaveBeenCalledWith("_id_");
    expect(mockListSearchIndexes).toHaveBeenCalledWith(MOVIE_SEARCH_INDEX.name);
    expect(mockCreateSearchIndex).toHaveBeenCalledWith(MOVIE_SEARCH_INDEX);
    expect(result).toEqual({
      collection: "movies",
      created: ["movies_poster_title_asc"],
      dropped: ["movies_poster_year_desc"],
      expected: MOVIE_INDEXES.map((index) => index.options.name),
      searchCreated: [MOVIE_SEARCH_INDEX.name],
      searchExpected: [MOVIE_SEARCH_INDEX.name],
      searchSkipped: undefined,
      searchUpdated: [],
    });
  });

  it("reports no changes when indexes already match the manifest", async () => {
    mockListIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { name: "_id_" },
        ...MOVIE_INDEXES.map((index) => ({ name: index.options.name })),
      ]),
    });
    mockListSearchIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          name: MOVIE_SEARCH_INDEX.name,
          latestDefinition: MOVIE_SEARCH_INDEX.definition,
        },
      ]),
    });

    const result = await syncMovieIndexes();

    expect(result.created).toEqual([]);
    expect(result.dropped).toEqual([]);
    expect(result.searchCreated).toEqual([]);
    expect(result.searchUpdated).toEqual([]);
    expect(mockDropIndex).not.toHaveBeenCalled();
    expect(mockCreateSearchIndex).not.toHaveBeenCalled();
    expect(mockUpdateSearchIndex).not.toHaveBeenCalled();
  });

  it("updates the Atlas Search index when the existing definition is stale", async () => {
    mockListSearchIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          name: MOVIE_SEARCH_INDEX.name,
          latestDefinition: {
            mappings: {
              dynamic: false,
              fields: {
                title: [{ type: "string" }],
              },
            },
          },
        },
      ]),
    });

    const result = await syncMovieIndexes();

    expect(mockCreateSearchIndex).not.toHaveBeenCalled();
    expect(mockUpdateSearchIndex).toHaveBeenCalledWith(
      MOVIE_SEARCH_INDEX.name,
      MOVIE_SEARCH_INDEX.definition,
    );
    expect(result.searchCreated).toEqual([]);
    expect(result.searchUpdated).toEqual([MOVIE_SEARCH_INDEX.name]);
  });

  it("updates the Atlas Search index when the analyzer definition is stale", async () => {
    mockListSearchIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          name: MOVIE_SEARCH_INDEX.name,
          latestDefinition: {
            ...MOVIE_SEARCH_INDEX.definition,
            analyzers: [
              {
                name: "compactKeyword",
                charFilters: [
                  {
                    type: "mapping",
                    mappings: {
                      " ": "",
                    },
                  },
                ],
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
          },
        },
      ]),
    });

    const result = await syncMovieIndexes();

    expect(mockCreateSearchIndex).not.toHaveBeenCalled();
    expect(mockUpdateSearchIndex).toHaveBeenCalledWith(
      MOVIE_SEARCH_INDEX.name,
      MOVIE_SEARCH_INDEX.definition,
    );
    expect(result.searchCreated).toEqual([]);
    expect(result.searchUpdated).toEqual([MOVIE_SEARCH_INDEX.name]);
  });

  it("reuses the same in-process sync result", async () => {
    await syncMovieIndexes();
    await syncMovieIndexes();

    expect(mockCreateIndexes).toHaveBeenCalledTimes(1);
    expect(mockCreateSearchIndex).toHaveBeenCalledTimes(1);
    expect(mockUpdateSearchIndex).not.toHaveBeenCalled();
    expect(mockDropIndex).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed sync", async () => {
    mockCreateIndexes
      .mockRejectedValueOnce(new Error("connection failed"))
      .mockResolvedValueOnce([]);
    mockListIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { name: "_id_" },
        { name: "movies_poster_year_desc" },
      ]),
    });

    await expect(syncMovieIndexes()).rejects.toThrow("connection failed");
    await expect(syncMovieIndexes()).resolves.toEqual({
      collection: "movies",
      created: MOVIE_INDEXES.map((index) => index.options.name),
      dropped: ["movies_poster_year_desc"],
      expected: MOVIE_INDEXES.map((index) => index.options.name),
      searchCreated: [MOVIE_SEARCH_INDEX.name],
      searchExpected: [MOVIE_SEARCH_INDEX.name],
      searchSkipped: undefined,
      searchUpdated: [],
    });

    expect(mockCreateIndexes).toHaveBeenCalledTimes(2);
    expect(mockDropIndex).toHaveBeenCalledTimes(1);
  });

  it("skips Atlas Search index sync when search commands are unavailable", async () => {
    mockListSearchIndexes.mockImplementation(() => {
      const error = new Error("command not found: listSearchIndexes") as Error & {
        codeName: string;
      };
      error.codeName = "CommandNotFound";
      throw error;
    });

    const result = await syncMovieIndexes();

    expect(result.searchCreated).toEqual([]);
    expect(result.searchExpected).toEqual([MOVIE_SEARCH_INDEX.name]);
    expect(result.searchSkipped).toBe("command not found: listSearchIndexes");
    expect(result.searchUpdated).toEqual([]);
    expect(mockCreateSearchIndex).not.toHaveBeenCalled();
    expect(mockUpdateSearchIndex).not.toHaveBeenCalled();
  });
});
