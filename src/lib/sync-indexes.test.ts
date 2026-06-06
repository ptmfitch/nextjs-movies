import { beforeEach, describe, expect, it, vi } from "vitest";

import { MOVIE_INDEXES, MOVIE_SEARCH_INDEXES } from "@/lib/db-indexes";
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
    mockCreateSearchIndex.mockResolvedValue("movies_title_search");
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
    expect(mockCreateSearchIndex).toHaveBeenCalledWith(MOVIE_SEARCH_INDEXES[0]);
    expect(mockDropIndex).toHaveBeenCalledWith("movies_poster_year_desc");
    expect(mockDropIndex).not.toHaveBeenCalledWith("_id_");
    expect(result).toEqual({
      collection: "movies",
      created: ["movies_poster_title_asc"],
      dropped: ["movies_poster_year_desc"],
      expected: MOVIE_INDEXES.map((index) => index.options.name),
      searchCreated: MOVIE_SEARCH_INDEXES.map((index) => index.name),
      searchExpected: MOVIE_SEARCH_INDEXES.map((index) => index.name),
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
      toArray: vi.fn().mockResolvedValue(
        MOVIE_SEARCH_INDEXES.map((index) => ({
          name: index.name,
          latestDefinition: index.definition,
        })),
      ),
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

  it("updates changed search indexes", async () => {
    mockListSearchIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          name: "movies_title_search",
          latestDefinition: { mappings: { dynamic: true } },
        },
      ]),
    });

    const result = await syncMovieIndexes();

    expect(mockUpdateSearchIndex).toHaveBeenCalledWith(
      "movies_title_search",
      MOVIE_SEARCH_INDEXES[0]?.definition,
    );
    expect(result.searchCreated).toEqual([]);
    expect(result.searchUpdated).toEqual(["movies_title_search"]);
  });

  it("continues when Atlas Search index commands are unsupported", async () => {
    mockListSearchIndexes.mockReturnValue({
      toArray: vi
        .fn()
        .mockRejectedValue(new Error("$listSearchIndexes is not supported")),
    });

    const result = await syncMovieIndexes();

    expect(result.searchCreated).toEqual([]);
    expect(result.searchUpdated).toEqual([]);
    expect(result.searchSkippedReason).toBe("$listSearchIndexes is not supported");
  });

  it("reuses the same in-process sync result", async () => {
    await syncMovieIndexes();
    await syncMovieIndexes();

    expect(mockCreateIndexes).toHaveBeenCalledTimes(1);
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
      searchCreated: MOVIE_SEARCH_INDEXES.map((index) => index.name),
      searchExpected: MOVIE_SEARCH_INDEXES.map((index) => index.name),
      searchUpdated: [],
    });

    expect(mockCreateIndexes).toHaveBeenCalledTimes(2);
    expect(mockDropIndex).toHaveBeenCalledTimes(1);
  });
});
