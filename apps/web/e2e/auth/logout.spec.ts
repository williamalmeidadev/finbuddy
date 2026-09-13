import { test, expect } from "@playwright/test";
import { registerTestUser } from "../helpers/test-fixtures";

test.describe("Authentication - Logout & Session Clear E2E", () => {
  test("logout clears session state and redirects to /login", async ({ page, request }) => {
    const user = await registerTestUser(request);

    // Login
    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    // Click Sign Out
    await page.click("button:has-text('Sign out'), button:has-text('Logout')");
    await expect(page).toHaveURL(/\/login/);

    // Verify protected route access is denied after logout
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
