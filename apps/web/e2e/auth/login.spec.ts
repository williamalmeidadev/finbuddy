import { test, expect } from "@playwright/test";
import { registerTestUser } from "../helpers/test-fixtures";

test.describe("Authentication - Login Flow E2E", () => {
  test("successful login with valid credentials", async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test("login rejection with invalid password", async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", "WrongPassword123!");
    await page.click("button[type='submit']");

    await expect(page.locator(".text-destructive")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login form validation for empty fields", async ({ page }) => {
    await page.goto("/login");
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/login/);
  });

  test("redirect authenticated users away from /login and /register to /app/dashboard", async ({ page, request }) => {
    const user = await registerTestUser(request);

    // Perform browser login
    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app\/dashboard/);

    // Attempt visiting /login again while logged in
    await page.goto("/login");
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // Attempt visiting /register while logged in
    await page.goto("/register");
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });
});
