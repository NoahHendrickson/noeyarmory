import { defineConfig } from "tsup";

// Consumer-facing library build (types + pure search/filter functions).
// The generator scripts (generate.ts / manifest.ts / build-index.ts) are run
// via tsx and are intentionally NOT part of this bundle.
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["fuse.js"],
});
