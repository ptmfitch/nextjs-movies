import { beforeEach, describe, expect, it, vi } from "vitest";

import { MOVIE_INDEXES } from "@/lib/db-indexes";
import { getDb } from "@/lib/mongodb";
import {
  resetMovieIndexSyncState,
  syncMovieIndexes,
} from "@/lib/sync-indexes";

const mockCreateIndexes = vi.fn();
const mockListIndexes = vi.fn();
const mockCollection = vi.fn(() => ({
  createIndexes: mockCreateIndexes,
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
    mockListIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { name: "_id_" },
        { name: "movies_poster_year_desc" },
      ]),
    });
    vi.mocked(getDb).mockResolvedValue({
      collection: mockCollection,
    } as never);
  });

  it("creates named indexes from the manifest", async () => {
    const result = await syncMovieIndexes();

    expect(mockCollection).toHaveBeenCalledWith("movies");
    expect(mockCreateIndexes).toHaveBeenCalledWith(
      MOVIE_INDEXES.map(({ key, options }) => ({ key, ...options })),
    );
    expect(result).toEqual({
      collection: "movies",
      created: [
        "movies_poster_year_asc",
        "movies_poster_title_asc",
        "movies_poster_title_desc",
      ],
      expected: MOVIE_INDEXES.map((index) => index.options.name),
    });
  });

  it("reports no created indexes when they already exist", async () => {
    mockListIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { name: "_id_" },
        ...MOVIE_INDEXES.map((index) => ({ name: index.options.name })),
      ]),
    });

    const result = await syncMovieIndexes();

    expect(result.created).toEqual([]);
  });

  it("reuses the same in-process sync result", async () => {
    await syncMovieIndexes();
    await syncMovieIndexes();

    expect(mockCreateIndexes).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed sync", async () => {
    mockCreateIndexes
      .mockRejectedValueOnce(new Error("connection failed"))
      .mockResolvedValueOnce([]);
    mockListIndexes.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ name: "_id_" }]),
    });

    await expect(syncMovieIndexes()).rejects.toThrow("connection failed");
    await expect(syncMovieIndexes()).resolves.toEqual({
      collection: "movies",
      created: MOVIE_INDEXES.map((index) => index.options.name),
      expected: MOVIE_INDEXES.map((index) => index.options.name),
    });

    expect(mockCreateIndexes).toHaveBeenCalledTimes(2);
  });
});
