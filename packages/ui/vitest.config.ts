import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const storybookConfigDir = new URL(".storybook", import.meta.url).pathname;

export default defineConfig({
  test: {
    projects: [
      {
        // Plain unit tests: jsdom + Testing Library.
        plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        // Storybook stories run as tests (play functions) in a real browser.
        plugins: [storybookTest({ configDir: storybookConfigDir })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
