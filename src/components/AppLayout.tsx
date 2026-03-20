import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, AlertCircle, Info, Trash2, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: notificacoes, isLoading: loadingNotifs } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notificacoes?.filter(n => !n.lida).length || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (id?: string) => {
      const query = supabase.from("notificacoes").update({ lida: true }).eq("user_id", user!.id);
      if (id) query.eq("id", id);
      else query.eq("lida", false);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  const deleteNotifMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notificacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  const { isColaborador } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'obrigacao_vencendo': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'tarefa_atrasada': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {!isColaborador && <AppSidebar />}
        <main className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between border-b px-6 shrink-0 bg-card/50 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-4">
              {!isColaborador ? <SidebarTrigger /> : <div className="font-bold text-xl tracking-tighter text-primary">SINDIPRO <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full ml-1">COLABORADOR</span></div>}
            </div>

            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-muted transition-colors">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-in zoom-in">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0 mr-4 shadow-2xl border-none bg-card/95 backdrop-blur-lg" align="end">
                  <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <h3 className="font-bold text-sm">Notificações</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 font-bold uppercase tracking-tight" onClick={() => markAsReadMutation.mutate(undefined)}>
                        Marcar todas como lidas
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="p-2 space-y-1">
                      {notificacoes?.length === 0 && (
                        <div className="py-20 text-center space-y-2">
                          <Bell className="h-10 w-10 mx-auto text-muted-foreground/20" />
                          <p className="text-sm text-muted-foreground">Tudo limpo por aqui!</p>
                        </div>
                      )}
                      {notificacoes?.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl transition-all relative group flex gap-3 ${n.lida ? 'opacity-60' : 'bg-primary/5 shadow-sm'}`}
                        >
                          <div className="mt-1 shrink-0">
                            {getIcon(n.tipo)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold leading-none mb-1">{n.titulo}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{n.mensagem}</p>
                            <p className="text-[9px] text-muted-foreground mt-2 font-medium">
                              {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.lida && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markAsReadMutation.mutate(n.id)}>
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteNotifMutation.mutate(n.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-3 pl-4 border-l">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold leading-none">{profile?.full_name || "Usuário"}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{(profile as any)?.role}</p>
                </div>
                <div
                  className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => navigate("/configuracoes")}
                >
                  {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover rounded-xl" /> : initials}
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-8 bg-muted/10">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
