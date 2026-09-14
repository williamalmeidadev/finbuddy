import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, LogIn, Mail, Lock, RefreshCw } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao autenticar. Verifique seu e-mail e senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 md:p-8 overflow-x-hidden">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            <Coins className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg">FinBuddy</span>
        </div>

        <Card className="overflow-hidden p-0 shadow-lg border-muted/80">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col justify-center bg-background">
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Acesse sua conta</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Gerencie suas finanças e converse com o assistente IA
                  </p>
                </div>

                {error && (
                  <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                    <Input
                      id="login-email"
                      type="hidden"
                      value={email}
                    />
                    <span className="absolute left-3 top-2.5 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                    <Input
                      id="login-password"
                      type="hidden"
                      value={password}
                    />
                    <span className="absolute left-3 top-2.5 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </span>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Entrar na Conta
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  Não possui uma conta?{" "}
                  <Link to="/register" className="text-primary font-semibold hover:underline">
                    Cadastre-se grátis
                  </Link>
                </p>
              </div>
            </form>

            <div className="relative hidden bg-muted md:block select-none overflow-hidden h-full">
              <img
                src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=1920&auto=format&fit=crop"
                alt="Gerenciamento Financeiro"
                className="absolute inset-0 h-full w-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 bg-primary/20 backdrop-brightness-[0.4]" />
              <div className="absolute bottom-10 left-10 right-10 text-white max-w-sm space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md">
                  <Coins className="h-4.5 w-4.5 text-primary" />
                </div>
                <blockquote className="space-y-1">
                  <p className="text-base font-medium leading-relaxed">
                    "O FinBuddy transformou a maneira como gerencio meu dinheiro."
                  </p>
                </blockquote>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
