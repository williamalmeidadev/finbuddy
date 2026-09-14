import { test, expect } from "@playwright/test";
import { registerTestUser, createTestAccount, API_BASE_URL } from "../helpers/test-fixtures";

test.describe("Budgets & Scenario C - Browser E2E", () => {
  test("Scenario C: Budget spending tracking updates when transactions mutate", async ({ page, request }) => {
    const user = await registerTestUser(request);
    const acc = await createTestAccount(request, user.accessToken!, {
      name: "Budget Account",
      type: "CHECKING",
      balance: 2000,
    });

    // 1. Create a category
    const catRes = await request.post(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { name: "Dining Out", type: "EXPENSE" },
    });
    const category = await catRes.json();

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const bdgRes = await request.post(`${API_BASE_URL}/budgets`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        categoryId: category.id,
        amount: 500,
        month: currentMonthStr,
      },
    });
    expect(bdgRes.ok()).toBe(true);

    // Login
    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    // 3. View Budgets page
    await page.goto("/app/budgets");
    await expect(page.locator("text=Dining Out")).toBeVisible();

    // 4. Create an expense transaction under category
    await page.goto("/app/transactions");
    await page.click("button:has-text('Record Transaction')");
    await page.fill("#tx-amount", "300");
    await page.selectOption("#tx-category", category.id);
    await page.click("button[type='submit']");

    // 5. Verify budget spent updates on Budgets page
    await page.goto("/app/budgets");
    await expect(page.locator("text=300")).toBeVisible();
  });
});
