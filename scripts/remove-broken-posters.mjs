import fs from "node:fs";
import { MongoClient } from "mongodb";

const CONCURRENCY = 40;
const BATCH_SIZE = 500;

function getEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const env = fs.readFileSync(".env.local", "utf8");
  const match = env.match(/MONGODB_URI=(.+)/);
  if (!match) {
    throw new Error("MONGODB_URI not found in environment or .env.local");
  }
  return match[1].trim();
}

async function checkPoster(url, retries = 1) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "nextjs-movies-poster-check/1.0",
      },
    });

    if (response.status === 404) {
      return "broken";
    }

    if (response.status === 405 || response.status === 403) {
      const getResponse = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "User-Agent": "nextjs-movies-poster-check/1.0",
        },
      });

      if (getResponse.status === 404) {
        return "broken";
      }
    }

    if (response.ok) {
      return "ok";
    }

    return "other";
  } catch {
    if (retries > 0) {
      return checkPoster(url, retries - 1);
    }
    return "error";
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker),
  );

  return results;
}

async function main() {
  const uri = getMongoUri();
  const dbName = getEnv("MONGODB_DB", "sample_mflix");
  const collectionName = getEnv("MONGODB_COLLECTION", "movies");
  const client = new MongoClient(uri);

  await client.connect();
  const collection = client.db(dbName).collection(collectionName);

  const cursor = collection.find(
    { poster: { $exists: true, $ne: "" } },
    { projection: { _id: 1, title: 1, poster: 1 } },
  );

  let scanned = 0;
  let cleared = 0;
  let brokenFound = 0;
  let kept = 0;
  let skipped = 0;

  while (true) {
    const batch = [];
    for (let i = 0; i < BATCH_SIZE; i += 1) {
      const doc = await cursor.next();
      if (!doc) {
        break;
      }
      batch.push(doc);
    }

    if (batch.length === 0) {
      break;
    }

    const checks = await mapWithConcurrency(batch, CONCURRENCY, async (doc) => {
      const status = await checkPoster(doc.poster);
      return { doc, status };
    });

    const idsToClear = [];

    for (const { doc, status } of checks) {
      scanned += 1;
      if (status === "broken") {
        brokenFound += 1;
        idsToClear.push(doc._id);
        console.log(`404: ${doc.title}`);
      } else if (status === "ok") {
        kept += 1;
      } else {
        skipped += 1;
      }
    }

    if (idsToClear.length > 0) {
      const result = await collection.updateMany(
        { _id: { $in: idsToClear } },
        { $unset: { poster: "" } },
      );
      cleared += result.modifiedCount;
    }

    console.log(
      `Progress: scanned=${scanned} cleared=${cleared} broken=${brokenFound} kept=${kept} skipped=${skipped}`,
    );
  }

  await cursor.close();
  await client.close();

  console.log(
    JSON.stringify({ scanned, cleared, brokenFound, kept, skipped }, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
