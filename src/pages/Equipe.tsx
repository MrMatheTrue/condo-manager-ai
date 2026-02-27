import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, Trash2, Loader2, ArrowLeft, Mail, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Equipe = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // ✅ FIX CRÍTICO: a query original fazia join com profiles que o RLS bloqueava.
    // Solução: buscar condominio_acessos sem join. Profiles têm policy que permite
    // síndico ler perfis da equipe — mas o join via Supabase PostgREST ainda falha
    // quando a foreign table tem RLS separada. Solução mais robusta: duas queries.
    const { data: acessos, isLoading: loadingAcessos, isError } = useQuery({
        queryKey: ["equipe-acessos", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("condominio_acessos")
                .select("id, user_id, status, colaborador_nome, created_at, nivel_acesso")
                .eq("condominio_id", id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data ?? [];
        },
        retry: 1,
        enabled: !!id,
    });

    // Busca perfis dos membros separadamente (após ter os IDs)
    const userIds = acessos?.map(a => a.user_id) ?? [];
    const { data: memberProfiles, isLoading: loadingProfiles } = useQuery({
        queryKey: ["equipe-profiles", userIds],
        queryFn: async () => {
            if (userIds.length === 0) return [];
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email, avatar_url, role")
                .in("id", userIds);
            if (error) throw error;
            return data ?? [];
        },
        enabled: userIds.length > 0,
        retry: 1,
    });

    const isLoading = loadingAcessos || (userIds.length > 0 && loadingProfiles);

    // Montar equipe unindo acessos + profiles
    const equipe = acessos?.map(acesso => ({
        ...acesso,
        profile: memberProfiles?.find(p => p.id === acesso.user_id) ?? null,
    })) ?? [];

    const pendentes = equipe.filter(m => m.status === "pendente");
    const aprovados = equipe.filter(m => m.status === "aprovado");

    const aprovarMutation = useMutation({
        mutationFn: async (acessoId: string) => {
            const { error } = await supabase
                .from("condominio_acessos")
                .update({ status: "aprovado" })
                .eq("id", acessoId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipe-acessos", id] });
            toast({ title: "Colaborador aprovado!", description: "Já tem acesso ao condomínio." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const recusarMutation = useMutation({
        mutationFn: async (acessoId: string) => {
            const { error } = await supabase
                .from("condominio_acessos")
                .update({ status: "recusado" })
                .eq("id", acessoId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipe-acessos", id] });
            toast({ title: "Solicitação recusada." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const removerMutation = useMutation({
        mutationFn: async (acessoId: string) => {
            const { error } = await supabase
                .from("condominio_acessos")
                .delete()
                .eq("id", acessoId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipe-acessos", id] });
            toast({ title: "Colaborador removido da equipe." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Carregando equipe...</p>
        </div>
    );

    if (isError) return (
        <div className="p-8 text-center space-y-4">
            <p className="font-bold text-destructive">Erro ao carregar equipe.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" /> Equipe
                    </h1>
                    <p className="text-muted-foreground mt-1">Gerencie colaboradores deste condomínio.</p>
                </div>
            </div>

            {/* Pendentes */}
            {pendentes.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-amber-500">
                        <Clock className="h-5 w-5" /> Aguardando Aprovação ({pendentes.length})
                    </h2>
                    {pendentes.map(m => (
                        <MemberCard
                            key={m.id}
                            member={m}
                            showActions
                            onAprovar={() => aprovarMutation.mutate(m.id)}
                            onRecusar={() => recusarMutation.mutate(m.id)}
                            onRemover={() => removerMutation.mutate(m.id)}
                            loadingAprovar={aprovarMutation.isPending}
                            loadingRecusar={recusarMutation.isPending}
                        />
                    ))}
                </section>
            )}

            {/* Aprovados */}
            <section className="space-y-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-emerald-500" /> Equipe Ativa ({aprovados.length})
                </h2>
                {aprovados.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-muted/20">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-bold">Nenhum colaborador ainda</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Colaboradores que solicitarem acesso aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    aprovados.map(m => (
                        <MemberCard
                            key={m.id}
                            member={m}
                            showActions={false}
                            onRemover={() => removerMutation.mutate(m.id)}
                            loadingAprovar={false}
                            loadingRecusar={false}
                        />
                    ))
                )}
            </section>
        </div>
    );
};

// ── Card de membro ──────────────────────────────────────────────────────────
function MemberCard({ member, showActions, onAprovar, onRecusar, onRemover, loadingAprovar, loadingRecusar }: {
    member: any;
    showActions: boolean;
    onAprovar?: () => void;
    onRecusar?: () => void;
    onRemover: () => void;
    loadingAprovar: boolean;
    loadingRecusar: boolean;
}) {
    const profile = member.profile;
    const displayName = profile?.full_name || member.colaborador_nome || "Colaborador";
    const email = profile?.email || "—";
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <Card className="border-none shadow-sm bg-card/60">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary shrink-0 text-lg">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        {email}
                    </p>
                    {member.status === "aprovado" && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                            Ativo
                        </span>
                    )}
                    {member.status === "pendente" && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                            Aguardando
                        </span>
                    )}
                </div>
                <div className="flex gap-2 shrink-0">
                    {showActions && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-500/10 font-bold"
                                onClick={onAprovar}
                                disabled={loadingAprovar}
                            >
                                {loadingAprovar ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                                <span className="ml-1 hidden sm:inline">Aprovar</span>
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                                onClick={onRecusar}
                                disabled={loadingRecusar}
                            >
                                {loadingRecusar ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                                <span className="ml-1 hidden sm:inline">Recusar</span>
                            </Button>
                        </>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={onRemover}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default Equipe;