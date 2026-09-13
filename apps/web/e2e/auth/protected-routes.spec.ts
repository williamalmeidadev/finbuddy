import { test, expect } from "@playwright/test";

test.describe("Authentication - Protected Routes Boundary E2E", () => {
  const protectedPaths = [
    "/app",
    "/app/dashboard",
    "/app/accounts",
    "/app/transactions",
    "/app/transfers",
    "/app/budgets",
    "/app/categories",
    "/app/recurring",
    "/app/ai",
    "/app/settings",
  ];

  for (const path of protectedPaths) {
    test(`unauthenticated access to ${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
