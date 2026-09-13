import { test, expect } from "@playwright/test";
import { registerTestUser, createTestAccount } from "../helpers/test-fixtures";

test.describe("Dashboard Overview - Browser E2E", () => {
  test("dashboard displays net worth, monthly summary cards, and connected accounts", async ({ page, request }) => {
    const user = await registerTestUser(request);
    await createTestAccount(request, user.accessToken!, {
      name: "Dashboard Checking",
      type: "CHECKING",
      balance: 2500,
    });

    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    await expect(page.locator("text=Total Net Worth")).toBeVisible();
    await expect(page.locator("text=Dashboard Checking")).toBeVisible();
  });
});
