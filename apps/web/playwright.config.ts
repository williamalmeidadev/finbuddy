import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3003",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `DATABASE_URL="${process.env.DATABASE_URL || 'postgresql://finbuddy:senhaDB232%40@localhost:5432/finbuddy'}" JWT_SECRET="${process.env.JWT_SECRET || 'NdOQ65X2opk54iL5AR1wg00LMTdivXxJfexziGVg3Ow='}" PORT=3000 CORS_ORIGIN="http://localhost:3003" DISABLE_RATE_LIMIT=true THROTTLE_LIMIT=10000 THROTTLE_AUTH_LIMIT=10000 node dist/main.js`,
      cwd: "../api",
      url: "http://localhost:3000/docs",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "VITE_API_URL=http://localhost:3000 npx vite --port 3003",
      cwd: ".",
      url: "http://localhost:3003",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
