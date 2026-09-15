import { tokenStorage } from "../src/lib/auth/token-storage";

describe("tokenStorage", () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
  });

  describe("getAccessToken", () => {
    it("returns null when no token is set", () => {
      expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it("returns the token after setAccessToken", () => {
      tokenStorage.setAccessToken("my-access-token");
      expect(tokenStorage.getAccessToken()).toBe("my-access-token");
    });
  });

  describe("setTokens", () => {
    it("sets the access token", () => {
      tokenStorage.setTokens("access-xyz");
      expect(tokenStorage.getAccessToken()).toBe("access-xyz");
    });
  });

  describe("clearTokens", () => {
    it("clears the access token", () => {
      tokenStorage.setAccessToken("some-token");
      tokenStorage.clearTokens();
      expect(tokenStorage.getAccessToken()).toBeNull();
    });
  });
});
