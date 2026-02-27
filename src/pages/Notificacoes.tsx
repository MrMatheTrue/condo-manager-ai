import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const tipoLabels: Record<string, string> = {
  obrigacao_vencendo: "Obrigação vencendo",
  tarefa_atrasada: "Tarefa atrasada",
  documento_adicionado: "Documento adicionado",
};

const Notificacoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notificacoes, isLoading } = useQuery({
    queryKey: ["notificacoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const marcarLidaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes", user?.id] }),
  });

  const marcarTodasMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("user_id", user!.id)
        .eq("lida", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes", user?.id] });
      toast({ title: "Todas as notificações marcadas como lidas." });
    },
  });

  const deletarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notificacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes", user?.id] }),
  });

  const naoLidas = notificacoes?.filter(n => !n.lida).length ?? 0;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium">Carregando notificações...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" /> Notificações
          </h1>
          <p className="text-muted-foreground mt-1">
            {naoLidas > 0 ? `${naoLidas} não lida(s)` : "Tudo em dia!"}
          </p>
        </div>
        {naoLidas > 0 && (
          <Button variant="outline" size="sm" onClick={() => marcarTodasMutation.mutate()} disabled={marcarTodasMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {!notificacoes?.length ? (
        <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/20">
          <Bell className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-bold">Nenhuma notificação</h3>
          <p className="text-muted-foreground mt-1 text-sm">Você receberá alertas de obrigações e tarefas aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificacoes.map((n) => (
            <Card
              key={n.id}
              className={`border-none shadow-sm transition-all ${!n.lida ? "bg-primary/5 border-l-4 border-l-primary" : "bg-card/60"}`}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${!n.lida ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${!n.lida ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {tipoLabels[n.tipo] ?? n.tipo}
                    </span>
                  </div>
                  <p className={`font-semibold text-sm ${!n.lida ? "text-foreground" : "text-muted-foreground"}`}>{n.titulo}</p>
                  {n.mensagem && <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {format(new Date(n.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!n.lida && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                      onClick={() => marcarLidaMutation.mutate(n.id)}
                      title="Marcar como lida"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => deletarMutation.mutate(n.id)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notificacoes;
