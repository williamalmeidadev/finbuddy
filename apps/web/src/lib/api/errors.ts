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

  static fromResponse(statusCode: number, data?: any): ApiError {
    let message = "An error occurred while communicating with the server.";
    if (data && typeof data === "object") {
      if (typeof data.message === "string") {
        message = data.message;
      } else if (Array.isArray(data.message) && data.message.length > 0) {
        message = data.message.join(", ");
      }
    }

    if (statusCode === 401) {
      message = (data && typeof data === "object" && typeof data.message === "string")
        ? data.message
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
