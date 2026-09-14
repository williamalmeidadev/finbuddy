import { test, expect } from "@playwright/test";
import { registerTestUser } from "../helpers/test-fixtures";

test.describe("Security - Open Redirect Prevention E2E", () => {
  test("arbitrary external redirect parameters are rejected and fall back to safe /app/dashboard", async ({ page, request }) => {
    const user = await registerTestUser(request);

    // Attempt login with malicious external redirect parameter
    await page.goto("/login?redirect=https://evil.example.com/phishing");
    await page.fill("#email, #login-email", user.email);
    await page.fill("#password, #login-password", user.password);
    await page.click("button[type='submit']");

    // Must redirect to internal /app/dashboard and NOT evil.example.com
    await page.waitForURL(/\/app\/dashboard/);
    expect(page.url()).not.toContain("evil.example.com");
  });
});
