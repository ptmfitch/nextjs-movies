import { MOVIE_INDEXES } from "@/lib/db-indexes";
import { getMongoCollectionName } from "@/lib/env";
import { getDb } from "@/lib/mongodb";

export interface SyncMovieIndexesResult {
  collection: string;
  created: string[];
  expected: string[];
}

let syncPromise: Promise<SyncMovieIndexesResult> | undefined;

async function runSync(): Promise<SyncMovieIndexesResult> {
  const db = await getDb();
  const collectionName = getMongoCollectionName();
  const collection = db.collection(collectionName);
  const expected = MOVIE_INDEXES.map((index) => index.options.name);

  // Driver v7 returns all index names from createIndexes(), not only new ones.
  const existing = new Set(
    (await collection.listIndexes().toArray()).map((index) => index.name),
  );
  const missing = expected.filter((name) => !existing.has(name));

  await collection.createIndexes(
    MOVIE_INDEXES.map(({ key, options }) => ({ key, ...options })),
  );

  return { collection: collectionName, created: missing, expected };
}

/**
 * Ensures movie collection indexes exist. Idempotent: createIndexes() is a
 * no-op for indexes that already match, and concurrent calls share one run.
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
