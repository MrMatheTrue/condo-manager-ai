import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string; // 'sindico' | 'colaborador'
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
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
  // ✅ FIX: defaults false — evita "flash" de acesso de síndico durante loading
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
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, role")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) {
        // Fallback sem coluna role
        const { data: fallbackData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (fallbackData) {
          const p = { ...fallbackData, role: "sindico" } as Profile;
          setProfile(p);
          return p;
        }
        return null;
      }

      setProfile(data as Profile);
      return data as Profile;
    } catch (err) {
      console.error("fetchProfile error:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);

        if (currentSession?.user) {
          const userId = currentSession.user.id;

          // ✅ FIX: Aplicar pending_role do OAuth ANTES de buscar o perfil
          const pendingRole = localStorage.getItem("pending_role");
          if (pendingRole) {
            try {
              await supabase.from("profiles").upsert({
                id: userId,
                role: pendingRole,
                full_name: currentSession.user.user_metadata?.full_name || "",
                email: currentSession.user.email || "",
              });
              localStorage.removeItem("pending_role");
            } catch (err) {
              console.error("Error applying pending role:", err);
            }
          }

          const loadedProfile = await fetchProfile(userId);

          // ✅ FIX: Redirecionar novo usuário Google para tela correta
          if (event === "SIGNED_IN" && currentSession.user.app_metadata?.provider === "google") {
            // Verifica se é novo usuário (criado há menos de 30 segundos)
            const createdAt = new Date(currentSession.user.created_at).getTime();
            const isNewUser = Date.now() - createdAt < 30000;

            if (isNewUser && loadedProfile) {
              const targetRole = pendingRole || loadedProfile.role;
              if (targetRole === "colaborador") {
                window.location.href = "/selecionar-condominio";
              } else {
                // Verifica se já tem condomínio cadastrado
                const { data: condos } = await supabase
                  .from("condominios")
                  .select("id")
                  .eq("sindico_id", userId)
                  .limit(1);
                if (!condos || condos.length === 0) {
                  window.location.href = "/onboarding";
                }
              }
            }
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setProfile(null);
      setSession(null);
    }
  };

  // ✅ FIX: defaults false — usuário sem perfil carregado não tem permissão alguma
  const isSindico = !!profile && (profile.role === "sindico" || profile.role === "zelador" || profile.role === "funcionario" || profile.role === "admin");
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