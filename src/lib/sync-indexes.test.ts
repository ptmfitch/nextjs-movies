import { beforeEach, describe, expect, it, vi } from "vitest";

import { MOVIE_INDEXES } from "@/lib/db-indexes";
import { getDb } from "@/lib/mongodb";
import {
  resetMovieIndexSyncState,
  syncMovieIndexes,
} from "@/lib/sync-indexes";

const mockCreateIndexes = vi.fn();
const mockDropIndex = vi.fn();
const mockListIndexes = vi.fn();
const mockCollection = vi.fn(() => ({
  createIndexes: mockCreateIndexes,
  dropIndex: mockDropIndex,
  listIndexes: mockListIndexes,
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
    mockDropIndex.mockResolvedValue(undefined);
    mockListIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { name: "_id_" },
        { name: "movies_poster_year_asc" },
        { name: "movies_poster_year_desc" },
      ]),
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
    expect(result).toEqual({
      collection: "movies",
      created: ["movies_poster_title_asc"],
      dropped: ["movies_poster_year_desc"],
      expected: MOVIE_INDEXES.map((index) => index.options.name),
    });
  });

  it("ignores orphan indexes already dropped by another sync", async () => {
    mockDropIndex.mockRejectedValueOnce(
      Object.assign(new Error("index not found"), {
        code: 27,
        codeName: "IndexNotFound",
      }),
    );

    const result = await syncMovieIndexes();

    expect(mockDropIndex).toHaveBeenCalledWith("movies_poster_year_desc");
    expect(result.dropped).toEqual([]);
  });

  it("reports no changes when indexes already match the manifest", async () => {
    mockListIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { name: "_id_" },
        ...MOVIE_INDEXES.map((index) => ({ name: index.options.name })),
      ]),
    });

    const result = await syncMovieIndexes();

    expect(result.created).toEqual([]);
    expect(result.dropped).toEqual([]);
    expect(mockDropIndex).not.toHaveBeenCalled();
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
    });

    expect(mockCreateIndexes).toHaveBeenCalledTimes(2);
    expect(mockDropIndex).toHaveBeenCalledTimes(1);
  });
});
