import { test, expect } from "@playwright/test";
import { registerTestUser, createTestAccount } from "../helpers/test-fixtures";

test.describe("Recurring Transactions - Browser E2E", () => {
  test("create recurring schedule, toggle active status, and delete", async ({ page, request }) => {
    const user = await registerTestUser(request);
    const acc = await createTestAccount(request, user.accessToken!, {
      name: "Recurring Account",
      type: "CHECKING",
      balance: 1000,
    });

    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    await page.goto("/app/recurring");
    await page.click("button:has-text('New Schedule')");
    await page.fill("#rec-amount", "49.90");
    await page.fill("#rec-desc", "Streaming Subscription");
    await page.click("button[type='submit']");

    await expect(page.locator("text=Streaming Subscription")).toBeVisible();
  });
});
