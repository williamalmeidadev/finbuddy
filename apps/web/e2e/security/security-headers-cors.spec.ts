import { test, expect } from "@playwright/test";
import { API_BASE_URL } from "../helpers/test-fixtures";

test.describe("Security - Security Headers & CORS Enforcement E2E", () => {
  test("API HTTP responses contain required security headers from Helmet", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/health`);
    expect(res.ok()).toBe(true);

    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBeDefined();
  });

  test("disallowed origins do not receive permissive Access-Control-Allow-Origin: *", async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/health`, {
      headers: { Origin: "https://disallowed-malicious-domain.com" },
    });

    const allowOrigin = res.headers()["access-control-allow-origin"];
    expect(allowOrigin).not.toBe("*");
  });
});
