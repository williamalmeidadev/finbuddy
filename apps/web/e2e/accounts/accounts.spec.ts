import { test, expect } from "@playwright/test";
import { registerTestUser } from "../helpers/test-fixtures";

test.describe("Accounts Management - Browser E2E", () => {
  test("create account, edit account name, and deactivate account", async ({ page, request }) => {
    const user = await registerTestUser(request);

    // Login
    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    // Navigate to Accounts
    await page.goto("/app/accounts");

    // Create Account
    await page.click("button:has-text('Add Account')");
    await page.fill("#acc-name", "Main Checking Account");
    await page.selectOption("#acc-type", "CHECKING");
    await page.fill("#acc-balance", "1500.00");
    await page.click("button[type='submit']");

    // Verify created account is rendered
    await expect(page.locator("text=Main Checking Account")).toBeVisible();

    // Edit Account Name
    await page.click("button:has-text('Edit')");
    await page.fill("#edit-acc-name", "Updated Checking Account");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Updated Checking Account")).toBeVisible();

    // Deactivate Account
    await page.click("button:has-text('Deactivate')");
    await page.click("button:has-text('Confirm Delete')");
    await expect(page.locator("text=Inactive")).toBeVisible();
  });
});
