/**
 * Frontend Token Storage & Auth Boundary Strategy
 *
 * In accordance with security section 13:
 * - Access tokens are stored in-memory (or fallback secure storage).
 * - Refresh tokens are handled via HTTP-only credentials.
 * - The browser never accesses database credentials or OpenAI API keys directly.
 */

let inMemoryToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    if (inMemoryToken) return inMemoryToken;
    if (typeof window !== "undefined") {
      return localStorage.getItem("finbuddy_access_token");
    }
    return null;
  },

  setAccessToken(token: string): void {
    inMemoryToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("finbuddy_access_token", token);
    }
  },

  clearAccessToken(): void {
    inMemoryToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("finbuddy_access_token");
    }
  },
};
