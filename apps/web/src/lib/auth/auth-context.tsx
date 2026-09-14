import * as React from "react";
import { ApiUser } from "../api/types";
import { tokenStorage } from "./token-storage";
import { apiClient } from "../api/client";

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

  // Restore authenticated session on initial render
  React.useEffect(() => {
    async function restoreSession() {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await apiClient<ApiUser>("/auth/me", {
          requiresAuth: true,
        });
        setUser(currentUser);
      } catch (err) {
        tokenStorage.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await apiClient<{
      accessToken: string;
      refreshToken: string;
      user: ApiUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      requiresAuth: false,
    });

    tokenStorage.setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
  }, []);

  const register = React.useCallback(
    async (name: string, email: string, password: string) => {
      // 1. Create user account (backend DTO strictly requires email and password)
      await apiClient<ApiUser>("/users", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
      });

      // 2. Automatically log in after registration
      await login(email, password);
    },
    [login]
  );

  const logout = React.useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient<{ message: string }>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
          requiresAuth: false,
        });
      } catch {
        // Ignore logout errors upstream
      }
    }
    tokenStorage.clearTokens();
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
