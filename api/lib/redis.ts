import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectionPromise: Promise<RedisClient> | null = null;

function getRedisUrl(): string {
  return (process.env.REDIS_URL ?? "").trim();
}

export function isRedisConfigured(): boolean {
  return Boolean(getRedisUrl());
}

export async function getRedis(): Promise<RedisClient> {
  if (client?.isOpen) {
    return client;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const url = getRedisUrl();

  if (!url) {
    throw new Error("REDIS_URL is not configured.");
  }

  const nextClient = createClient({ url });

  nextClient.on("error", (error: Error) => {
    console.error("[oqerun-cloud] Redis error:", error);
  });

  connectionPromise = nextClient
    .connect()
    .then(() => {
      client = nextClient;
      return nextClient;
    })
    .catch((error: unknown) => {
      connectionPromise = null;
      client = null;
      try {
        nextClient.destroy();
      } catch {
        // Ignore cleanup failures after a failed connection.
      }
      throw error;
    });

  return connectionPromise;
}
