"use client";

import * as React from "react";
import { ApiUser } from "../api/types";
import { tokenStorage } from "./token-storage";

export interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: ApiUser, token: string) => void;
  logout: () => void;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      // In production foundation, initial token presence marks auth state
      setUser({
        id: "user-foundation-id",
        email: "user@finbuddy.dev",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      });
    }
    setIsLoading(false);
  }, []);

  const setAuth = React.useCallback((newUser: ApiUser, token: string) => {
    tokenStorage.setAccessToken(token);
    setUser(newUser);
  }, []);

  const logout = React.useCallback(() => {
    tokenStorage.clearAccessToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
