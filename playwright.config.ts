import { defineConfig, devices } from "@playwright/test";

const PLAYWRIGHT_PORT = 3100;
const PLAYWRIGHT_HOST = "127.0.0.1";
const PLAYWRIGHT_BASE_URL = `http://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm build && node scripts/start-standalone.mjs",
    url: PLAYWRIGHT_BASE_URL,
    env: {
      ...process.env,
      HOSTNAME: PLAYWRIGHT_HOST,
      PORT: `${PLAYWRIGHT_PORT}`,
    },
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
