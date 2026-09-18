import { tokenStorage } from "../auth/token-storage";
import { ApiError } from "./errors";

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  _isRetry?: boolean;
}

export function getBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  return "http://localhost:3000";
}

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

let activeRefreshPromise: Promise<any> | null = null;

export async function refreshTokens<T = { accessToken: string; user: any }>(): Promise<T> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const isJson = response.headers
        .get("content-type")
        ?.includes("application/json");
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        tokenStorage.clearTokens();
        throw ApiError.fromResponse(response.status, data);
      }

      tokenStorage.setTokens(data.accessToken);
      return data;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, _isRetry = false, headers = {}, ...fetchOptions } = options;

  if (endpoint.includes("/auth/refresh")) {
    return refreshTokens() as Promise<T>;
  }

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
      credentials: "include", // always send cookies (finbuddy_rt HttpOnly cookie)
    });

    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");
    const data = isJson ? await response.json() : null;

    // Handle 401 and Token Refresh logic
    if (response.status === 401 && requiresAuth && !_isRetry && !endpoint.includes("/auth/")) {
      try {
        const refreshData = await refreshTokens();
        onRefreshed(refreshData.accessToken);

        // Retry original request
        return apiClient<T>(endpoint, {
          ...options,
          _isRetry: true,
        });
      } catch (refreshErr) {
        onRefreshFailed(refreshErr);
        throw refreshErr;
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
