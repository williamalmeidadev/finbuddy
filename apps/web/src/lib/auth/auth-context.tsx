import * as React from "react";
import { ApiUser } from "../api/types";
import { tokenStorage } from "./token-storage";
import { apiClient } from "../api/client";
import { clearQueryCacheOnLogout } from "../query/query-client";

export interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Restore authenticated session on initial render using the HttpOnly cookie.
  // /auth/refresh reads the cookie automatically (credentials: "include" in apiClient).
  React.useEffect(() => {
    async function restoreSession() {
      try {
        const refreshData = await apiClient<{ accessToken: string; user: ApiUser }>(
          "/auth/refresh",
          { method: "POST", requiresAuth: false }
        );
        tokenStorage.setTokens(refreshData.accessToken);
        setUser(refreshData.user);
      } catch {
        // No valid session — user must log in
        tokenStorage.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    clearQueryCacheOnLogout();

    const res = await apiClient<{
      accessToken: string;
      user: ApiUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      requiresAuth: false,
    });

    // Refresh token is set as HttpOnly cookie by the backend — not returned in the body.
    tokenStorage.setTokens(res.accessToken);
    setUser(res.user);
  }, []);

  const register = React.useCallback(
    async (name: string, email: string, password: string) => {
      await apiClient<ApiUser>("/users", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
      });
      await login(email, password);
    },
    [login]
  );

  const logout = React.useCallback(async () => {
    try {
      // No body — the HttpOnly cookie is forwarded automatically via credentials: "include".
      await apiClient<{ message: string }>("/auth/logout", {
        method: "POST",
        requiresAuth: false,
      });
    } catch {
      // Best-effort: clear local state regardless
    }
    tokenStorage.clearTokens();
    clearQueryCacheOnLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
