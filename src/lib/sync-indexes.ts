import { MOVIE_INDEXES } from "@/lib/db-indexes";
import { getMongoCollectionName } from "@/lib/env";
import { getDb } from "@/lib/mongodb";

export interface SyncMovieIndexesResult {
  collection: string;
  created: string[];
  dropped: string[];
  expected: string[];
}

const PRESERVED_INDEX_NAMES = new Set(["_id_"]);
const INDEX_NOT_FOUND_ERROR_CODE = 27;

let syncPromise: Promise<SyncMovieIndexesResult> | undefined;

function isIndexNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const mongoError = error as Error & { code?: number; codeName?: string };

  return (
    mongoError.code === INDEX_NOT_FOUND_ERROR_CODE ||
    mongoError.codeName === "IndexNotFound"
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

    try {
      await collection.dropIndex(name);
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        throw error;
      }

      continue;
    }

    dropped.push(name);
  }

  return {
    collection: collectionName,
    created: missing,
    dropped,
    expected: expectedNames,
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
