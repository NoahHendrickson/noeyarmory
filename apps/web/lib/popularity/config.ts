import "server-only";

/** Whether Upstash Redis env vars are present for popularity tracking. */
export function isPopularityConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
