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

    if (result.created.length === 0 && result.dropped.length === 0) {
      console.log(
        `Indexes already up to date on ${result.collection} (${result.expected.join(", ")})`,
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
