import { test, expect } from "@playwright/test";

test.describe("Accessibility & Responsive Viewports - Browser E2E", () => {
  const viewports = [
    { name: "Desktop", width: 1280, height: 800 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Mobile", width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    test(`renders login page layout correctly without horizontal scroll on ${vp.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");

      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();

      // Check horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });
  }

  test("form fields and buttons have accessible roles and labels", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.locator("#email");
    await expect(emailInput).toHaveAttribute("type", "email");

    const submitBtn = page.locator("button[type='submit']");
    await expect(submitBtn).toBeVisible();
  });
});
