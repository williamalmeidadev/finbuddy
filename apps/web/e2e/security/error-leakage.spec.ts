import { test, expect } from "@playwright/test";
import { API_BASE_URL } from "../helpers/test-fixtures";

test.describe("Security - Error Data Leakage Protection E2E", () => {
  test("invalid or malformed requests return sanitized error messages without internal stack traces or database URLs", async ({ request }) => {
    // Malformed UUID request
    const res = await request.get(`${API_BASE_URL}/accounts/not-a-valid-uuid`);
    expect([400, 404]).toContain(res.status());

    const bodyText = await res.text();
    expect(bodyText).not.toContain("prisma");
    expect(bodyText).not.toContain("postgresql://");
    expect(bodyText).not.toContain("SELECT ");
    expect(bodyText).not.toContain("node_modules");
    expect(bodyText).not.toContain("sk-");
  });
});
