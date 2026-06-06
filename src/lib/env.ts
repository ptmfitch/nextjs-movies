function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getMongoUri(): string {
  return getEnv("MONGODB_URI");
}

export function getMongoDbName(): string {
  return process.env.MONGODB_DB ?? "sample_mflix";
}

export function getMongoCollectionName(): string {
  return process.env.MONGODB_COLLECTION ?? "movies";
}
