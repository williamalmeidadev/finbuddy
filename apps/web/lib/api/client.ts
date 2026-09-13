import { tokenStorage } from "../auth/token-storage";
import { ApiError } from "./errors";

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  _isRetry?: boolean;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, _isRetry = false, headers = {}, ...fetchOptions } = options;

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

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
            const refreshRes = await fetch(`${BASE_URL.replace(/\/$/, "")}/auth/refresh`, {
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
              throw ApiError.fromResponse(401, data);
            }
          } catch (refreshErr) {
            isRefreshing = false;
            tokenStorage.clearTokens();
            throw ApiError.fromResponse(401, data);
          }
        } else {
          // Wait for active refresh
          return new Promise<T>((resolve, reject) => {
            subscribeTokenRefresh((newToken: string) => {
              apiClient<T>(endpoint, {
                ...options,
                _isRetry: true,
              })
                .then(resolve)
                .catch(reject);
            });
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
