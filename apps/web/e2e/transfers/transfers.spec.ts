import { test, expect } from "@playwright/test";
import { registerTestUser, createTestAccount, API_BASE_URL } from "../helpers/test-fixtures";

test.describe("Transfers & Financial Invariants - Browser E2E", () => {
  test("Scenario B: Atomic transfer creation, updates, and deletion balance reversals", async ({ page, request }) => {
    const user = await registerTestUser(request);
    const accA = await createTestAccount(request, user.accessToken!, {
      name: "Source Account A",
      type: "CHECKING",
      balance: 1000,
    });
    const accB = await createTestAccount(request, user.accessToken!, {
      name: "Target Account B",
      type: "SAVINGS",
      balance: 500,
    });

    // Login
    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    // Navigate to Transfers
    await page.goto("/app/transfers");
    await page.click("button:has-text('New Transfer')");
    await page.selectOption("#tr-from", accA.id);
    await page.selectOption("#tr-to", accB.id);
    await page.fill("#tr-amount", "300");
    await page.fill("#tr-desc", "Monthly Savings Allocation");
    await page.click("button[type='submit']");

    await expect(page.locator("text=Source Account A ➔ Target Account B").or(page.locator("text=Monthly Savings Allocation"))).toBeVisible();

    // Verify balances (A = 1000 - 300 = 700; B = 500 + 300 = 800)
    await page.goto("/app/accounts");
    await expect(page.locator("text=R$ 700,00")).toBeVisible();
    await expect(page.locator("text=R$ 800,00")).toBeVisible();

    // Delete transfer and verify balance reversal (A = 1000; B = 500)
    await page.goto("/app/transfers");
    await page.click("button[title*='Delete Transfer']");
    await page.click("button:has-text('Confirm Delete')");

    await page.goto("/app/accounts");
    await expect(page.locator("text=R$ 1.000,00")).toBeVisible();
    await expect(page.locator("text=R$ 500,00")).toBeVisible();
  });

  test("Transfer Deletion Edge Case: Transfer A -> B, B spends funds, then Transfer is deleted (permits negative balance on destination B)", async ({ request }) => {
    const user = await registerTestUser(request);
    const accA = await createTestAccount(request, user.accessToken!, {
      name: "Source A",
      type: "CHECKING",
      balance: 1000,
    });
    const accB = await createTestAccount(request, user.accessToken!, {
      name: "Target B",
      type: "CHECKING",
      balance: 0,
    });

    // 1. Transfer 500 from A to B (A=500, B=500)
    const transferRes = await request.post(`${API_BASE_URL}/transfers`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        fromAccountId: accA.id,
        toAccountId: accB.id,
        amount: 500,
        transactionAt: new Date().toISOString(),
      },
    });
    expect(transferRes.ok()).toBe(true);
    const transferData = await transferRes.json();

    // 2. B spends all 500 (B=0)
    const expenseRes = await request.post(`${API_BASE_URL}/transactions`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        accountId: accB.id,
        type: "EXPENSE",
        amount: 500,
        description: "Spent transferred funds",
        transactionAt: new Date().toISOString(),
      },
    });
    expect(expenseRes.ok()).toBe(true);

    // 3. Delete Transfer A -> B
    const delRes = await request.delete(`${API_BASE_URL}/transfers/${transferData.id}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(delRes.ok()).toBe(true);

    // 4. Verify backend state: Source A balance restored to 1000, Target B balance is -500
    const accARes = await request.get(`${API_BASE_URL}/accounts/${accA.id}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    const accBRes = await request.get(`${API_BASE_URL}/accounts/${accB.id}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    const refreshedA = await accARes.json();
    const refreshedB = await accBRes.json();

    expect(refreshedA.balance).toBe(1000);
    expect(refreshedB.balance).toBe(-500);
  });
});
