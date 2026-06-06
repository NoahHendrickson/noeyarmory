import { defineConfig } from "tsup";

// Library build for @repo/ui. Within the monorepo the package is consumed as
// source (see package.json "exports" -> ./src), transpiled by Next.js
// (transpilePackages) and Storybook/Vitest (Vite). This build produces a
// standalone ESM + d.ts artifact and doubles as a type/validation gate in CI.
export default defineConfig({
  // Explicit entries: library code only (no *.stories.tsx / *.test.tsx).
  entry: {
    index: "src/index.ts",
    "components/button": "src/components/button.tsx",
    "components/card": "src/components/card.tsx",
    "components/input": "src/components/input.tsx",
    "components/badge": "src/components/badge.tsx",
    "components/segmented-toggle": "src/components/segmented-toggle.tsx",
    "components/kbd": "src/components/kbd.tsx",
    "components/filter-chip": "src/components/filter-chip.tsx",
    "components/result-row": "src/components/result-row.tsx",
    "components/dialog": "src/components/dialog.tsx",
    "components/command-palette": "src/components/command-palette.tsx",
    "lib/utils": "src/lib/utils.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "@base-ui/react"],
});
