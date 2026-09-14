/**
 * Frontend Token Storage & Auth Boundary Strategy
 *
 * Security Requirements:
 * - Access tokens and refresh tokens are stored safely in client storage/memory.
 * - Sensitive database credentials and backend secret keys are NEVER exposed to the frontend.
 * - The token storage handles both access and refresh token lifecycle.
 */

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("finbuddy_at");
    }
    return null;
  },

  setAccessToken(token: string): void {
    inMemoryAccessToken = token;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("finbuddy_at", token);
    }
  },

  getRefreshToken(): string | null {
    if (inMemoryRefreshToken) return inMemoryRefreshToken;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("finbuddy_rt");
    }
    return null;
  },

  setRefreshToken(token: string): void {
    inMemoryRefreshToken = token;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("finbuddy_rt", token);
    }
  },

  setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  },

  clearTokens(): void {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("finbuddy_at");
      sessionStorage.removeItem("finbuddy_rt");
    }
  },
};
