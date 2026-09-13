import { request, APIRequestContext } from "@playwright/test";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  accessToken?: string;
  refreshToken?: string;
}

export function generateRandomEmail(prefix = "e2e-user"): string {
  const nonce = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${Date.now()}-${nonce}@example.com`;
}

export async function registerTestUser(
  apiContext: APIRequestContext,
  customEmail?: string,
  customPassword = "Password123!"
): Promise<TestUser> {
  const email = customEmail || generateRandomEmail();
  const regRes = await apiContext.post(`${API_BASE_URL}/users`, {
    data: { email, password: customPassword },
  });

  let userId: string | undefined;
  if (regRes.ok()) {
    const body = await regRes.json();
    userId = body.id;
  }

  const loginRes = await apiContext.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password: customPassword },
  });

  if (!loginRes.ok()) {
    throw new Error(`Failed to login created user: ${loginRes.status()}`);
  }

  const loginData = await loginRes.json();
  return {
    id: userId || loginData.user?.id,
    email,
    password: customPassword,
    accessToken: loginData.accessToken,
    refreshToken: loginData.refreshToken,
  };
}

export async function createTestAccount(
  apiContext: APIRequestContext,
  token: string,
  accountData: { name: string; type: string; balance: number; currency?: string }
) {
  const res = await apiContext.post(`${API_BASE_URL}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      currency: "BRL",
      ...accountData,
    },
  });
  if (!res.ok()) {
    throw new Error(`Failed to create test account: ${res.status()}`);
  }
  return res.json();
}
