import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    include: [
      "test/browser-smoke.test.ts",
      "test/plugins.browser.test.ts",
      "test/react.browser.test.tsx",
      "test/sync.browser.test.ts",
    ],
  },
});
