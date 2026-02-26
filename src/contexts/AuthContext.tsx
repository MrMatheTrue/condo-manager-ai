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
  isSindico: true,
  isColaborador: false,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      // First attempt: fetch with role column
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, role")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile with role:", error);

        // If error suggests column missing, try without it
        if (error.message.includes("role") || error.code === "PGRST204") {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone, avatar_url")
            .eq("id", userId)
            .maybeSingle();

          if (fallbackData) {
            setProfile({ ...fallbackData, role: "sindico" } as Profile);
            return;
          }
          if (fallbackError) console.error("Fallback profile fetch failed:", fallbackError);
        }
      } else if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error("Unexpected error in fetchProfile:", err);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          try {
            await fetchProfile(session.user.id);
          } catch (e) {
            console.error("onAuthStateChange profile fetch error:", e);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isSindico = profile?.role === "sindico" || !profile?.role || profile?.role === "funcionario" || profile?.role === "zelador";
  const isColaborador = profile?.role === "colaborador";

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
