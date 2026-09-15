import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/queries";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Sun, Moon, LogOut, ShieldCheck } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { user: authUser, logout } = useAuth();
  const { data: profileUser } = useProfile();
  const { theme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const user = profileUser || authUser;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie seu perfil, preferências visuais e dados de sessão.
        </p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* User Profile Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Perfil do Usuário
            </CardTitle>
            <CardDescription>Dados da sua conta autenticada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-semibold">{user?.name || "Usuário"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-semibold">{user?.email || "-"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">ID do Usuário</span>
              <span className="font-mono text-xs text-muted-foreground">{user?.id || "-"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Status da Conta</span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs bg-emerald-500/10 px-2 py-0.5 rounded">
                <ShieldCheck className="h-3.5 w-3.5" /> Ativo & Protegido
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Appearance & Theme */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
              Aparência do Aplicativo
            </CardTitle>
            <CardDescription>Escolha seu tema visual de preferência.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Tema Atual</p>
              <p className="text-xs text-muted-foreground capitalize">{theme === "dark" ? "Modo Escuro (Dark)" : "Modo Claro (Light)"}</p>
            </div>
            <Button variant="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4 text-amber-500" /> : <Moon className="mr-2 h-4 w-4 text-indigo-500" />}
              Alternar Tema
            </Button>
          </CardContent>
        </Card>

        {/* Logout Action */}
        <Card className="shadow-sm border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Encerrar Sessão
            </CardTitle>
            <CardDescription>Revoga tokens e desconecta a conta deste dispositivo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Saindo..." : "Sair da Conta FinBuddy"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
