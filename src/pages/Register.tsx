import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, ShieldCheck, HardHat, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Role = "sindico" | "colaborador";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast({ variant: "destructive", title: "Selecione seu papel", description: "Escolha se você é Síndico(a) ou Colaborador(a)." });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone, role },
        // Redirect to /dashboard after email confirmation — AuthContext handles the rest
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao cadastrar", description: error.message });
      return;
    }

    // Case 1: Email confirmation is REQUIRED (Supabase default)
    // data.session is null — user must confirm email first
    if (!data.session) {
      setEmailSent(true);
      toast({
        title: "Verifique seu e-mail!",
        description: `Enviamos um link de confirmação para ${email}. Clique no link para ativar sua conta.`,
      });
      return;
    }

    // Case 2: Email confirmation is DISABLED — auto-confirmed, session exists
    // The trigger handle_new_user already created the profile.
    // No need to upsert here — trigger handles it with SECURITY DEFINER.
    toast({
      title: "Cadastro realizado!",
      description: role === "sindico"
        ? "Bem-vindo! Vamos configurar seu primeiro condomínio."
        : "Bem-vindo! Agora selecione o condomínio onde você trabalha.",
    });

    if (role === "sindico") {
      navigate("/onboarding");
    } else {
      navigate("/selecionar-condominio");
    }
  };

  const handleGoogleRegister = async () => {
    if (!role) {
      toast({ variant: "destructive", title: "Selecione seu papel", description: "Escolha se você é Síndico(a) ou Colaborador(a) antes de continuar." });
      return;
    }
    // Save role so AuthContext can apply it after OAuth redirect
    localStorage.setItem("pending_role", role);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  const roles: { id: Role; label: string; desc: string; icon: React.ElementType }[] = [
    { id: "sindico", label: "Síndico(a)", desc: "Gerencio condomínios e equipes", icon: ShieldCheck },
    { id: "colaborador", label: "Colaborador(a)", desc: "Executo tarefas e rondas diárias", icon: HardHat },
  ];

  // ── Email confirmation sent screen ────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 gradient-hero">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold">SíndicoOS</span>
            </Link>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Mail className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Confirme seu e-mail</CardTitle>
            <CardDescription className="mt-2">
              Enviamos um link de confirmação para <strong>{email}</strong>.
              Clique no link para ativar sua conta e fazer login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm text-primary space-y-2">
              <p>✓ Verifique sua caixa de entrada e spam</p>
              <p>✓ O link expira em 24 horas</p>
              <p>✓ Após confirmar, você poderá fazer login</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
              Voltar ao cadastro
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 gradient-hero">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">SíndicoOS</span>
          </Link>
          <CardTitle className="text-2xl">Crie sua conta</CardTitle>
          <CardDescription>Primeiro, qual é o seu papel?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            {roles.map(({ id, label, desc, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all duration-200 cursor-pointer",
                  role === id
                    ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-7 w-7", role === id ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="font-bold text-sm">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {role && (
            <div className="space-y-1 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-primary font-medium">
              {role === "sindico"
                ? "✓ Você terá acesso total para gerenciar condomínios, obrigações e equipes."
                : "✓ Após o cadastro, selecione seu condomínio e aguarde aprovação do síndico."}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" placeholder="João da Silva" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !role}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar conta
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleRegister}
            disabled={loading || !role}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar com Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
