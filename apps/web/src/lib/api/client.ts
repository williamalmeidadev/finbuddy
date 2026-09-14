import { tokenStorage } from "../auth/token-storage";
import { ApiError } from "./errors";

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  _isRetry?: boolean;
}

export function getBaseUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof process !== "undefined" && process.env && (process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL)) {
    return process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  }
  return "http://localhost:3000";
}

let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function subscribeTokenRefresh(): Promise<string> {
  return new Promise((resolve, reject) => {
    refreshSubscribers.push({ resolve, reject });
  });
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err: unknown) {
  refreshSubscribers.forEach(({ reject }) => reject(err));
  refreshSubscribers = [];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, _isRetry = false, headers = {}, ...fetchOptions } = options;

  const baseUrl = getBaseUrl();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });

    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");
    const data = isJson ? await response.json() : null;

    // Handle 401 and Token Refresh logic
    if (response.status === 401 && requiresAuth && !_isRetry && !endpoint.includes("/auth/")) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              tokenStorage.setTokens(refreshData.accessToken, refreshData.refreshToken);
              isRefreshing = false;
              onRefreshed(refreshData.accessToken);
              
              // Retry original request
              return apiClient<T>(endpoint, {
                ...options,
                _isRetry: true,
              });
            } else {
              isRefreshing = false;
              tokenStorage.clearTokens();
              const err = ApiError.fromResponse(401, data);
              onRefreshFailed(err);
              throw err;
            }
          } catch (refreshErr) {
            isRefreshing = false;
            tokenStorage.clearTokens();
            onRefreshFailed(refreshErr);
            throw refreshErr;
          }
        } else {
          // Wait for active refresh
          await subscribeTokenRefresh();
          return apiClient<T>(endpoint, {
            ...options,
            _isRetry: true,
          });
        }
      } else {
        tokenStorage.clearTokens();
        throw ApiError.fromResponse(401, data);
      }
    }

    if (!response.ok) {
      throw ApiError.fromResponse(response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0
    );
  }
}
