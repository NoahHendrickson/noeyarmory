import type { HttpClient } from "bungie-api-ts/http";
import {
  getDestinyManifest,
  getDestinyManifestSlice,
  type DestinyManifestSlice,
} from "bungie-api-ts/destiny2";

/** The manifest tables we need to flatten weapons + perk pools + stats. */
export const MANIFEST_SLICES = [
  "DestinyInventoryItemDefinition",
  "DestinyPlugSetDefinition",
  "DestinyStatDefinition",
  "DestinyDamageTypeDefinition",
] as const;

export type ManifestDefs = DestinyManifestSlice<typeof MANIFEST_SLICES>;

/**
 * A minimal Bungie HTTP client. bungie-api-ts builds absolute URLs, so we just
 * attach the API key header and parse JSON.
 */
export function createHttpClient(apiKey: string): HttpClient {
  const client: HttpClient = async (config) => {
    const url = new URL(config.url);
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        url.searchParams.set(key, value);
      }
    }
    const res = await fetch(url, {
      method: config.method,
      headers: { "X-API-Key": apiKey },
      body: config.body != null ? JSON.stringify(config.body) : undefined,
    });
    if (!res.ok) {
      throw new Error(
        `Bungie API ${config.method} ${config.url} → ${res.status} ${res.statusText}`,
      );
    }
    const data: unknown = await res.json();
    return data as never;
  };
  return client;
}

/** Download the manifest version + the definition tables we need. */
export async function downloadManifest(
  apiKey: string,
): Promise<{ version: string; defs: ManifestDefs }> {
  const http = createHttpClient(apiKey);
  const manifest = await getDestinyManifest(http);
  const defs = await getDestinyManifestSlice(http, {
    destinyManifest: manifest.Response,
    tableNames: [...MANIFEST_SLICES],
    language: "en",
  });
  return { version: manifest.Response.version, defs };
}
