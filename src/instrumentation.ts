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
    return;
  }

  console.info(
    `[db] Movie indexes already up to date on ${result.collection} (${result.expected.join(", ")})`,
  );
}
