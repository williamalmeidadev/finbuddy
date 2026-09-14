import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ProtectedRoute, PublicOnlyRoute } from "@/lib/auth/auth-guard";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query/query-client";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout/AppLayout";

import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AccountsPage } from "@/pages/AccountsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { TransfersPage } from "@/pages/TransfersPage";
import { BudgetsPage } from "@/pages/BudgetsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { RecurringPage } from "@/pages/RecurringPage";
import { AiAssistantPage } from "@/pages/AiAssistantPage";
import { SettingsPage } from "@/pages/SettingsPage";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="finbuddy-theme">
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="transfers" element={<TransfersPage />} />
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="recurring" element={<RecurringPage />} />
              <Route path="ai" element={<AiAssistantPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback Redirects */}
            <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
