import { tokenStorage } from "../lib/auth/token-storage";

describe("Token Storage Unit Tests", () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
  });

  it("should return null when tokens are not set", () => {
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it("should store and retrieve access and refresh tokens in memory", () => {
    tokenStorage.setTokens("mock-access-token", "mock-refresh-token");
    expect(tokenStorage.getAccessToken()).toBe("mock-access-token");
    expect(tokenStorage.getRefreshToken()).toBe("mock-refresh-token");
  });

  it("should clear tokens correctly", () => {
    tokenStorage.setTokens("mock-access-token", "mock-refresh-token");
    tokenStorage.clearTokens();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});
