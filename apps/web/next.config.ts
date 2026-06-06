import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @repo/ui is consumed as TypeScript source; let Next compile it.
  transpilePackages: ["@repo/ui"],
  images: {
    // Weapon + perk icons are served from Bungie's CDN.
    remotePatterns: [{ protocol: "https", hostname: "www.bungie.net" }],
  },
};

export default nextConfig;
