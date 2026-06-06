import { closeDb } from "@/lib/mongodb";
import { syncMovieIndexes } from "@/lib/sync-indexes";

async function main() {
  try {
    const result = await syncMovieIndexes();

    if (result.created.length > 0) {
      console.log(
        `Created indexes on ${result.collection}: ${result.created.join(", ")}`,
      );
    }

    if (result.dropped.length > 0) {
      console.log(
        `Dropped indexes on ${result.collection}: ${result.dropped.join(", ")}`,
      );
    }

    if (result.searchCreated.length > 0) {
      console.log(
        `Created search indexes on ${result.collection}: ${result.searchCreated.join(", ")}`,
      );
    }

    if (result.searchUpdated.length > 0) {
      console.log(
        `Updated search indexes on ${result.collection}: ${result.searchUpdated.join(", ")}`,
      );
    }

    if (result.searchSkippedReason) {
      console.log(
        `Skipped search index sync on ${result.collection}: ${result.searchSkippedReason}`,
      );
    }

    if (
      result.created.length === 0 &&
      result.dropped.length === 0 &&
      result.searchCreated.length === 0 &&
      result.searchUpdated.length === 0 &&
      !result.searchSkippedReason
    ) {
      console.log(
        `Indexes already up to date on ${result.collection} (${[
          ...result.expected,
          ...result.searchExpected,
        ].join(", ")})`,
      );
    }
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to sync movie indexes: ${message}`);
  process.exit(1);
});
