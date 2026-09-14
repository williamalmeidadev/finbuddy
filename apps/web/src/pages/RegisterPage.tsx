import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, UserPlus, Mail, Lock, User, RefreshCw } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
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
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await register(name || "Usuário FinBuddy", email, password);
      navigate("/app/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao registrar conta. Verifique os dados fornecidos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 md:p-8">
      <div className="absolute top-4 left-4 flex items-center gap-2 font-semibold text-primary">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          <Coins className="h-4 w-4" />
        </div>
        <span className="font-bold text-lg">FinBuddy</span>
      </div>

      <div className="w-full max-w-4xl flex flex-col gap-6">
        <Card className="overflow-hidden p-0 shadow-lg border-muted/80">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col justify-center bg-background">
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Crie sua conta</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Comece a controlar suas finanças hoje mesmo
                  </p>
                </div>

                {error && (
                  <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="Alex Silva (opcional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                    />
                    <span className="absolute left-3 top-2.5 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </span>
                  </div>
                </div>

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
                    <span className="absolute left-3 top-2.5 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha (mínimo 8 caracteres)</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                      minLength={8}
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
                      Criando Conta...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Cadastrar Grátis
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  Já possui uma conta?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">
                    Fazer Login
                  </Link>
                </p>
              </div>
            </form>

            <div className="relative hidden bg-muted md:block select-none overflow-hidden h-full">
              <img
                src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1920&auto=format&fit=crop"
                alt="Cadastro FinBuddy"
                className="absolute inset-0 h-full w-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 bg-primary/20 backdrop-brightness-[0.4]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
