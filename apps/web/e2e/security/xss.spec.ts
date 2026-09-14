import { test, expect } from "@playwright/test";
import { registerTestUser, createTestAccount } from "../helpers/test-fixtures";

test.describe("Security - XSS Payload Shielding E2E", () => {
  const xssPayloads = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    '"><script>alert("XSS")</script>',
    "javascript:alert(1)",
  ];

  for (const payload of xssPayloads) {
    test(`XSS payload "${payload}" in account name is rendered as plain text data without script execution`, async ({ page, request }) => {
      const user = await registerTestUser(request);

      let dialogTriggered = false;
      page.on("dialog", (dialog) => {
        dialogTriggered = true;
        dialog.dismiss();
      });

      // Login
      await page.goto("/login");
      await page.fill("#email, #login-email", user.email);
      await page.fill("#password, #login-password", user.password);
      await page.click("button[type='submit']");
      await page.waitForURL(/\/app\/dashboard/);

      // Create account with XSS payload
      await page.goto("/app/accounts");
      await page.click("button:has-text('Add Account')");
      await page.fill("#acc-name", payload);
      await page.fill("#acc-balance", "100");
      await page.click("button[type='submit']");

      // Verify no browser alert dialog was fired
      expect(dialogTriggered).toBe(false);

      // Verify page content renders safely
      const cardTitle = page.locator(`text=${payload}`);
      await expect(cardTitle).toBeVisible();
    });
  }
});
