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
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://mcp.figma.com https://www.clarity.ms https://scripts.clarity.ms",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://www.bungie.net",
      "font-src 'self'",
      "connect-src 'self' https://www.bungie.net https://database-clarity.github.io https://*.clarity.ms https://c.bing.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    const headers = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [
      {
        source: "/data/:name.:hash([0-9a-f]{16}).json",
        headers: [
          ...headers,
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/data/:name.manifest.json",
        headers: [...headers, { key: "Cache-Control", value: "no-cache" }],
      },
      { source: "/:path*", headers },
    ];
  },
};

export default nextConfig;
