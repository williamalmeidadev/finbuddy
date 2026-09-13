import { ApiError } from "../lib/api/errors";

describe("API Client Error Normalization", () => {
  it("should normalize 401 Unauthorized status correctly", () => {
    const error = ApiError.fromResponse(401);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain("Session expired");
  });

  it("should normalize 429 Rate Limit status correctly", () => {
    const error = ApiError.fromResponse(429);
    expect(error.statusCode).toBe(429);
    expect(error.message).toContain("Rate limit exceeded");
  });

  it("should normalize 503 Service Unavailable status correctly", () => {
    const error = ApiError.fromResponse(503);
    expect(error.statusCode).toBe(503);
    expect(error.message).toContain("Service temporarily unavailable");
  });

  it("should extract message from JSON error response object", () => {
    const error = ApiError.fromResponse(400, { message: "Invalid UUID argument" });
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Invalid UUID argument");
  });
});
