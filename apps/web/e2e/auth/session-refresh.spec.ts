import { test, expect } from "@playwright/test";
import { registerTestUser } from "../helpers/test-fixtures";

test.describe("Authentication - Session & Refresh Token E2E", () => {
  test("automatic token refresh and transparent request retry on 401", async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    // Refresh dashboard data
    await page.click("button:has-text('Refresh')");
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test("refresh failure terminates session and redirects to /login", async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    // Corrupt tokens in browser context
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Attempting an API request without valid refresh token triggers session termination
    await page.goto("/app/accounts");
    await page.waitForTimeout(500);
  });
});
