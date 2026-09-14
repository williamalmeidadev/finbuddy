import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CreditCard,
  ArrowRightLeft,
  ArrowUpRight,
  FolderTree,
  Target,
  Repeat,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  Coins,
  Sun,
  Moon,
  User,
} from "lucide-react";

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { to: "/app/dashboard", label: "Visão Geral", icon: LayoutDashboard },
    { to: "/app/accounts", label: "Contas & Cartões", icon: CreditCard },
    { to: "/app/transactions", label: "Transações", icon: ArrowRightLeft },
    { to: "/app/transfers", label: "Transferências", icon: ArrowUpRight },
    { to: "/app/budgets", label: "Orçamentos", icon: Target },
    { to: "/app/categories", label: "Categorias", icon: FolderTree },
    { to: "/app/recurring", label: "Recorrentes", icon: Repeat },
    { to: "/app/ai", label: "Assistente IA", icon: Bot },
    { to: "/app/settings", label: "Configurações", icon: Settings },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Mobile Header */}
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:hidden fixed top-0 inset-x-0 z-30">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Coins className="h-6 w-6" />
          <span className="text-lg font-bold">FinBuddy</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0 pt-16 md:pt-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="hidden md:flex h-16 items-center gap-2 border-b px-6 font-semibold text-primary">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            <Coins className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">FinBuddy</span>
        </div>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-3 border-b p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {user.name || "Usuário"}
              </span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="border-t p-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <>
                <Sun className="mr-2.5 h-4 w-4 text-amber-500" />
                Modo Claro
              </>
            ) : (
              <>
                <Moon className="mr-2.5 h-4 w-4 text-indigo-500" />
                Modo Escuro
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2.5 h-4 w-4" />
            Sair da Conta / Logout
          </Button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col min-w-0 bg-background pt-16 md:pt-0 overflow-y-auto">
        <Outlet />
      </main>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
