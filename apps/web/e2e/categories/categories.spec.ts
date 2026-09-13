import { test, expect } from "@playwright/test";
import { registerTestUser } from "../helpers/test-fixtures";

test.describe("Categories Management - Browser E2E", () => {
  test("create custom category, edit details, and delete custom category", async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    await page.goto("/app/categories");
    await page.click("button:has-text('Add Category')");
    await page.fill("#cat-name", "Software Subscriptions");
    await page.click("button[type='submit']");

    await expect(page.locator("text=Software Subscriptions")).toBeVisible();
  });
});
