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
      command: "DATABASE_URL='postgresql://finbuddy:senhaDB232%40@localhost:5432/finbuddy' JWT_SECRET='NdOQ65X2opk54iL5AR1wg00LMTdivXxJfexziGVg3Ow=' PORT=3002 npm run start:prod --workspace=@finbuddy/api",
      url: "http://localhost:3002/docs",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "PORT=3003 NEXT_PUBLIC_API_URL=http://localhost:3002 npm run start --workspace=@finbuddy/web",
      url: "http://localhost:3003",
      reuseExistingServer: true,
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
