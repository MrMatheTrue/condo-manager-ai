import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
}

interface AuthContextType {
  session: Session | null;
  user: Session["user"] | null;
  loading: boolean;
  profile: Profile | null;
  isSindico: boolean;
  isColaborador: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  profile: null,
  isSindico: false,
  isColaborador: false,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, role")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        const p: Profile = { ...data, role: data.role ?? "sindico" };
        setProfile(p);
        return p;
      }

      // Perfil não existe — criar automaticamente
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role ?? "sindico";
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: user.user_metadata?.full_name ?? user.email ?? "",
          email: user.email ?? "",
          role,
        });
        const p: Profile = {
          id: userId,
          full_name: user.user_metadata?.full_name ?? "",
          email: user.email ?? "",
          phone: null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          role,
        };
        setProfile(p);
        return p;
      }
      return null;
    } catch (err) {
      console.error("fetchProfile error:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  };

  useEffect(() => {
    let mounted = true;

    // Inicializa com sessão do localStorage imediatamente
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        await fetchProfile(s.user.id);
      }
      if (mounted) setLoading(false);
    });

    // Escuta mudanças posteriores (token refresh, signOut, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (event === "TOKEN_REFRESHED" && currentSession) {
          setSession(currentSession);
          return;
        }

        // SIGNED_IN via OAuth — precisamos criar/atualizar o perfil
        if (event === "SIGNED_IN" && currentSession) {
          setSession(currentSession);

          // Aplicar pending_role de OAuth (setado no Register)
          const pendingRole = localStorage.getItem("pending_role");
          if (pendingRole) {
            try {
              await supabase.from("profiles").upsert({
                id: currentSession.user.id,
                role: pendingRole,
                full_name: currentSession.user.user_metadata?.full_name ?? "",
                email: currentSession.user.email ?? "",
                avatar_url: currentSession.user.user_metadata?.avatar_url ?? null,
              });
              localStorage.removeItem("pending_role");
            } catch (err) {
              console.error("pending_role upsert error:", err);
            }
          }

          const loadedProfile = await fetchProfile(currentSession.user.id);

          // Redirecionar usuário NOVO para fluxo correto
          const created = new Date(currentSession.user.created_at).getTime();
          const isNew = Date.now() - created < 60_000;

          if (isNew && loadedProfile) {
            if (loadedProfile.role === "colaborador") {
              window.location.href = "/selecionar-condominio";
              return;
            } else if (loadedProfile.role === "sindico") {
              const { count } = await supabase
                .from("condominios")
                .select("id", { count: "exact", head: true })
                .eq("sindico_id", currentSession.user.id);
              if (!count || count === 0) {
                window.location.href = "/onboarding";
                return;
              }
            }
          }
        }

        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    window.location.href = "/login";
  };

  const isSindico = !!profile && ["sindico", "admin", "zelador", "funcionario"].includes(profile.role);
  const isColaborador = !!profile && profile.role === "colaborador";

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      profile,
      isSindico,
      isColaborador,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}