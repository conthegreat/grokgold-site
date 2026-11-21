import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const port = process.env.PORT || "4173";
const baseURL = `http://127.0.0.1:${port}/grokgold-site/`;

const mobile = { width: 375, height: 812 };

export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node tests/server.mjs",
    cwd: root,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { PORT: port },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      name: "mobile-chromium",
      use: { ...devices["Desktop Chrome"], viewport: mobile, isMobile: true, hasTouch: true },
    },
    {
      name: "mobile-firefox",
      use: { ...devices["Desktop Firefox"], viewport: mobile, isMobile: true, hasTouch: true },
    },
    {
      name: "mobile-webkit",
      use: { ...devices["Desktop Safari"], viewport: mobile, isMobile: true, hasTouch: true },
    },
  ],
});
