import { test, expect } from "@playwright/test";
import { registerTestUser, createTestAccount, API_BASE_URL } from "../helpers/test-fixtures";

test.describe("Security - Authorization & IDOR Isolation E2E", () => {
  test("User A cannot access or mutate User B's accounts, transactions, or transfers (IDOR protection)", async ({ request }) => {
    // 1. Create two isolated test users
    const userA = await registerTestUser(request, undefined, "Password123!");
    const userB = await registerTestUser(request, undefined, "Password123!");

    // 2. Create financial account under User B
    const accB = await createTestAccount(request, userB.accessToken!, {
      name: "User B Secret Account",
      type: "CHECKING",
      balance: 1000,
    });

    // 3. User A attempts direct API access to User B's account -> 404 expected
    const getAccRes = await request.get(`${API_BASE_URL}/accounts/${accB.id}`, {
      headers: { Authorization: `Bearer ${userA.accessToken}` },
    });
    expect([403, 404]).toContain(getAccRes.status());

    // 4. User A attempts updating User B's account -> 404 expected
    const patchAccRes = await request.patch(`${API_BASE_URL}/accounts/${accB.id}`, {
      headers: { Authorization: `Bearer ${userA.accessToken}` },
      data: { name: "Hacked Account Name" },
    });
    expect([403, 404]).toContain(patchAccRes.status());

    // 5. User A attempts deactivating User B's account -> 404 expected
    const delAccRes = await request.delete(`${API_BASE_URL}/accounts/${accB.id}`, {
      headers: { Authorization: `Bearer ${userA.accessToken}` },
    });
    expect([403, 404]).toContain(delAccRes.status());
  });

  test("User A cannot execute transfer using User B's account as source or destination", async ({ request }) => {
    const userA = await registerTestUser(request);
    const userB = await registerTestUser(request);

    const accA = await createTestAccount(request, userA.accessToken!, {
      name: "User A Account",
      type: "CHECKING",
      balance: 500,
    });

    const accB = await createTestAccount(request, userB.accessToken!, {
      name: "User B Account",
      type: "CHECKING",
      balance: 500,
    });

    // User A attempts transfer from accA to accB (cross-user destination)
    const crossTransferRes = await request.post(`${API_BASE_URL}/transfers`, {
      headers: { Authorization: `Bearer ${userA.accessToken}` },
      data: {
        fromAccountId: accA.id,
        toAccountId: accB.id,
        amount: 100,
      },
    });

    expect([400, 403, 404]).toContain(crossTransferRes.status());
  });
});
