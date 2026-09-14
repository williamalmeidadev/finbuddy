/**
 * Normalized API Error Class
 *
 * Prevents internal infrastructure, Prisma, or OpenAI details from leaking to the user interface.
 */

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorDetails?: unknown;

  constructor(message: string, statusCode = 500, errorDetails?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;
  }

  static fromResponse(statusCode: number, data?: unknown): ApiError {
    let message = "An error occurred while communicating with the server.";
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (typeof d.message === "string") {
        message = d.message;
      } else if (Array.isArray(d.message) && d.message.length > 0) {
        message = (d.message as string[]).join(", ");
      }
    }

    if (statusCode === 401) {
      message = (data && typeof data === "object" && typeof (data as Record<string, unknown>).message === "string")
        ? (data as Record<string, unknown>).message as string
        : "Session expired or unauthorized. Please log in again.";
    } else if (statusCode === 403) {
      message = "You do not have permission to perform this action.";
    } else if (statusCode === 429) {
      message = "Rate limit exceeded. Please wait a moment before retrying.";
    } else if (statusCode === 503) {
      message = "Service temporarily unavailable. Please try again shortly.";
    }

    return new ApiError(message, statusCode, data);
  }
}
