import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// Load repo-root .env so OAuth + generate share one local secrets file.
loadEnv({ path: resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  // @repo/ui is consumed as TypeScript source; let Next compile it.
  transpilePackages: ["@repo/ui", "@repo/destiny"],
  images: {
    // Weapon + perk icons are served from Bungie's CDN.
    remotePatterns: [{ protocol: "https", hostname: "www.bungie.net" }],
  },
};

export default nextConfig;
