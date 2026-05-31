// Lightweight Redis client wrapper — falls back to a no-op when ioredis is not installed
type RedisClient = any;

let client: RedisClient | null = null;

function createNoop() {
  return {
    get: async (_key: string) => null,
    set: async (_key: string, _val: any) => null,
    del: async (_key: string) => null,
    quit: async () => null,
  } as RedisClient;
}

export function getRedis(): RedisClient {
  if (client) return client;
  try {
    // require at runtime so the repo doesn't fail when the package isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require("ioredis");
    client = new IORedis(process.env.REDIS_URL);
    return client;
  } catch (e) {
    // no redis available — return noop client to keep runtime non-breaking
    // eslint-disable-next-line no-console
    console.warn("ioredis not available, using noop redis client");
    client = createNoop();
    return client;
  }
}

export default getRedis;
