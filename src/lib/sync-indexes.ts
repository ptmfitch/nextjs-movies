import { MOVIE_INDEXES, MOVIE_SEARCH_INDEXES } from "@/lib/db-indexes";
import { getMongoCollectionName } from "@/lib/env";
import { getDb } from "@/lib/mongodb";

export interface SyncMovieIndexesResult {
  collection: string;
  created: string[];
  dropped: string[];
  expected: string[];
  searchCreated: string[];
  searchSkippedReason?: string;
  searchUpdated: string[];
  searchExpected: string[];
}

const PRESERVED_INDEX_NAMES = new Set(["_id_"]);

interface SearchIndexInfo {
  name: string;
  definition?: unknown;
  latestDefinition?: unknown;
}

let syncPromise: Promise<SyncMovieIndexesResult> | undefined;

function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForComparison);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalizeForComparison(nested)]),
    );
  }

  return value;
}

function definitionsMatch(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeForComparison(left)) ===
    JSON.stringify(normalizeForComparison(right))
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSearchIndexUnsupportedError(error: unknown): boolean {
  const message = getErrorMessage(error);

  return (
    message.includes("$listSearchIndexes") ||
    message.includes("listSearchIndexes") ||
    message.includes("Search index commands are only supported on Atlas") ||
    message.includes("Atlas Search") ||
    message.includes("not allowed in this atlas tier")
  );
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

  const searchCreated: string[] = [];
  const searchUpdated: string[] = [];
  let searchSkippedReason: string | undefined;
  const searchExpected = MOVIE_SEARCH_INDEXES.map((index) => index.name);

  try {
    const existingSearchIndexes =
      (await collection.listSearchIndexes().toArray()) as SearchIndexInfo[];
    const existingByName = new Map(
      existingSearchIndexes.map((index) => [index.name, index]),
    );

    for (const searchIndex of MOVIE_SEARCH_INDEXES) {
      const existingSearchIndex = existingByName.get(searchIndex.name);

      if (!existingSearchIndex) {
        await collection.createSearchIndex(searchIndex);
        searchCreated.push(searchIndex.name);
        continue;
      }

      const existingDefinition =
        existingSearchIndex.latestDefinition ?? existingSearchIndex.definition;

      if (!definitionsMatch(existingDefinition, searchIndex.definition)) {
        await collection.updateSearchIndex(
          searchIndex.name,
          searchIndex.definition,
        );
        searchUpdated.push(searchIndex.name);
      }
    }
  } catch (error) {
    if (!isSearchIndexUnsupportedError(error)) {
      throw error;
    }

    searchSkippedReason = getErrorMessage(error);
  }

  return {
    collection: collectionName,
    created: missing,
    dropped,
    expected: expectedNames,
    searchCreated,
    searchSkippedReason,
    searchUpdated,
    searchExpected,
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
