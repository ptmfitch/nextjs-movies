import { MOVIE_INDEXES, MOVIE_SEARCH_INDEX } from "@/lib/db-indexes";
import { getMongoCollectionName } from "@/lib/env";
import { getDb } from "@/lib/mongodb";
import type { Collection, Document } from "mongodb";

export interface SyncMovieIndexesResult {
  collection: string;
  created: string[];
  dropped: string[];
  expected: string[];
  searchCreated: string[];
  searchExpected: string[];
  searchSkipped?: string;
}

const PRESERVED_INDEX_NAMES = new Set(["_id_"]);

let syncPromise: Promise<SyncMovieIndexesResult> | undefined;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSearchIndexUnsupportedError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { code, codeName } = error as { code?: number; codeName?: string };
  const message = getErrorMessage(error).toLowerCase();

  return (
    code === 59 ||
    codeName === "CommandNotFound" ||
    message.includes("command not found") ||
    message.includes("listsearchindexes") ||
    message.includes("search index commands are only supported on atlas")
  );
}

async function syncAtlasSearchIndex(
  collection: Collection<Document>,
): Promise<Pick<SyncMovieIndexesResult, "searchCreated" | "searchSkipped">> {
  try {
    const existingSearchIndexes = await collection
      .listSearchIndexes(MOVIE_SEARCH_INDEX.name)
      .toArray();

    if (existingSearchIndexes.length === 0) {
      await collection.createSearchIndex(MOVIE_SEARCH_INDEX);
      return { searchCreated: [MOVIE_SEARCH_INDEX.name] };
    }

    return { searchCreated: [] };
  } catch (error) {
    if (isSearchIndexUnsupportedError(error)) {
      return { searchCreated: [], searchSkipped: getErrorMessage(error) };
    }

    throw error;
  }
}

async function runSync(): Promise<SyncMovieIndexesResult> {
  const db = await getDb();
  const collectionName = getMongoCollectionName();
  const collection = db.collection(collectionName);
  const expectedNames = MOVIE_INDEXES.map((index) => index.options.name);
  const expected = new Set(expectedNames);

  const existingIndexes = await collection.listIndexes().toArray();
  const existing = new Set(existingIndexes.map((index) => index.name));
  const missing = expectedNames.filter((name) => !existing.has(name));

  await collection.createIndexes(
    MOVIE_INDEXES.map(({ key, options }) => ({ key, ...options })),
  );

  const dropped: string[] = [];
  for (const { name } of existingIndexes) {
    if (expected.has(name) || PRESERVED_INDEX_NAMES.has(name)) {
      continue;
    }

    await collection.dropIndex(name);
    dropped.push(name);
  }

  const searchResult = await syncAtlasSearchIndex(collection);

  return {
    collection: collectionName,
    created: missing,
    dropped,
    expected: expectedNames,
    searchCreated: searchResult.searchCreated,
    searchExpected: [MOVIE_SEARCH_INDEX.name],
    searchSkipped: searchResult.searchSkipped,
  };
}

/**
 * Reconciles movie collection indexes to the manifest. Idempotent: creates
 * missing indexes, drops extras not in MOVIE_INDEXES, and concurrent calls
 * share one run.
 */
export async function syncMovieIndexes(): Promise<SyncMovieIndexesResult> {
  if (!syncPromise) {
    syncPromise = runSync().catch((error) => {
      syncPromise = undefined;
      throw error;
    });
  }

  return syncPromise;
}

/** @internal Resets in-process sync state for unit tests. */
export function resetMovieIndexSyncState(): void {
  syncPromise = undefined;
}
