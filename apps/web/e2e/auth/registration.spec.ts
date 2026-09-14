import { test, expect } from "@playwright/test";
import { generateRandomEmail, API_BASE_URL } from "../helpers/test-fixtures";

test.describe("Authentication - Registration Flow E2E", () => {
  test("successful registration with valid credentials and automatic redirect", async ({ page }) => {
    await page.goto("/register");
    const testEmail = generateRandomEmail("reg-valid");

    await page.fill("#email", testEmail);
    await page.fill("#password", "StrongPass123!");
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test("registration rejection with invalid email format", async ({ page }) => {
    await page.goto("/register");

    await page.fill("#email", "invalid-email-format");
    await page.fill("#password", "StrongPass123!");
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/register/);
  });

  test("duplicate email registration rejection", async ({ page, request }) => {
    const existingEmail = generateRandomEmail("existing-user");
    // Pre-register user
    await request.post(`${API_BASE_URL}/users`, {
      data: { email: existingEmail, password: "Password123!" },
    });

    await page.goto("/register");
    await page.fill("#email", existingEmail);
    await page.fill("#password", "Password123!");
    await page.click("button[type='submit']");

    await expect(page.locator(".bg-destructive\\/10")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });
});
