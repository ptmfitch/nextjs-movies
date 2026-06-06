export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { syncMovieIndexes } = await import("@/lib/sync-indexes");
  const result = await syncMovieIndexes();

  if (result.created.length > 0) {
    console.info(
      `[db] Created indexes on ${result.collection}: ${result.created.join(", ")}`,
    );
  }

  if (result.dropped.length > 0) {
    console.info(
      `[db] Dropped indexes on ${result.collection}: ${result.dropped.join(", ")}`,
    );
  }

  if (result.searchCreated.length > 0) {
    console.info(
      `[db] Created search indexes on ${result.collection}: ${result.searchCreated.join(", ")}`,
    );
  }

  if (result.searchUpdated.length > 0) {
    console.info(
      `[db] Updated search indexes on ${result.collection}: ${result.searchUpdated.join(", ")}`,
    );
  }

  if (result.searchSkippedReason) {
    console.info(
      `[db] Skipped search index sync on ${result.collection}: ${result.searchSkippedReason}`,
    );
  }

  if (
    result.created.length === 0 &&
    result.dropped.length === 0 &&
    result.searchCreated.length === 0 &&
    result.searchUpdated.length === 0 &&
    !result.searchSkippedReason
  ) {
    console.info(
      `[db] Movie indexes already up to date on ${result.collection} (${[
        ...result.expected,
        ...result.searchExpected,
      ].join(", ")})`,
    );
  }
}
