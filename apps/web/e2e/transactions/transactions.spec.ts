import { test, expect } from "@playwright/test";
import { registerTestUser, createTestAccount } from "../helpers/test-fixtures";

test.describe("Transactions Ledger & Scenario A - Browser E2E", () => {
  test("Scenario A: Full transaction life-cycle balance updates & ledger entry integrity", async ({ page, request }) => {
    const user = await registerTestUser(request);
    const acc = await createTestAccount(request, user.accessToken!, {
      name: "Ledger Account",
      type: "CHECKING",
      balance: 1000,
    });

    // Login
    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    // Navigate to Transactions
    await page.goto("/app/transactions");

    // Record Income Transaction of 500
    await page.click("button:has-text('Record Transaction')");
    await page.click("button:has-text('Income')");
    await page.fill("#tx-amount", "500");
    await page.fill("#tx-desc", "Freelance Bonus");
    await page.click("button[type='submit']");

    await expect(page.locator("text=Freelance Bonus")).toBeVisible();

    // Verify balance on accounts page
    await page.goto("/app/accounts");
    await expect(page.locator("text=R$ 1.500,00")).toBeVisible();

    // Record Expense Transaction of 200
    await page.goto("/app/transactions");
    await page.click("button:has-text('Record Transaction')");
    await page.fill("#tx-amount", "200");
    await page.fill("#tx-desc", "Office Supplies");
    await page.click("button[type='submit']");

    await expect(page.locator("text=Office Supplies")).toBeVisible();

    // Verify balance on accounts page (1500 - 200 = 1300)
    await page.goto("/app/accounts");
    await expect(page.locator("text=R$ 1.300,00")).toBeVisible();
  });
});
