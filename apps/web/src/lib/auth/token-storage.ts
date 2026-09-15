/**
 * Frontend Token Storage & Auth Boundary Strategy
 *
 * Security model (post HttpOnly cookie migration):
 * - Access token: stored in a module-level variable only (never in sessionStorage or localStorage).
 *   Cleared on page reload — the /auth/refresh endpoint restores the session using the HttpOnly cookie.
 * - Refresh token: stored exclusively as an HttpOnly cookie managed by the backend.
 *   JS cannot read or write it. The browser forwards it automatically on requests to /auth/*.
 */

let inMemoryAccessToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },

  setAccessToken(token: string): void {
    inMemoryAccessToken = token;
  },

  setTokens(accessToken: string): void {
    this.setAccessToken(accessToken);
  },

  clearTokens(): void {
    inMemoryAccessToken = null;
  },
};
