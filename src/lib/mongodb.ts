import { MongoClient, type Db } from "mongodb";

import { getMongoDbName, getMongoUri } from "@/lib/env";

interface MongoCache {
  client: MongoClient;
  promise: Promise<MongoClient>;
}

declare global {
  var _mongoClientPromise: MongoCache | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(getMongoUri());
    global._mongoClientPromise = {
      client,
      promise: client.connect(),
    };
  }

  return global._mongoClientPromise.promise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(getMongoDbName());
}

/** Closes the shared client. Used by one-off scripts, not the Next.js server. */
export async function closeDb(): Promise<void> {
  if (!global._mongoClientPromise) {
    return;
  }

  await global._mongoClientPromise.client.close();
  global._mongoClientPromise = undefined;
}
