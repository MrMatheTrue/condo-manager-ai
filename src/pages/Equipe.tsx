import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Shield, Mail, Trash2, ShieldAlert, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const modulesList = [
    { id: "obrigacoes", label: "Obrigações" },
    { id: "documentos", label: "Documentos" },
    { id: "checkin", label: "Check-in" },
    { id: "equipe", label: "Equipe" },
    { id: "configuracoes", label: "Configurações" }
];

const Equipe = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form states
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [acesso, setAcesso] = useState("leitura");
    const [permitidos, setPermitidos] = useState<string[]>(["obrigacoes", "documentos"]);

    const { data: equipe, isLoading } = useQuery({
        queryKey: ["equipe", id],
        queryFn: async () => {
            // Correcting join for profiles
            const { data, error } = await supabase
                .from("condominio_acessos")
                .select("*, profile:profiles(full_name, email, avatar_url, role)")
                .eq("condominio_id", id);
            if (error) throw error;
            return data;
        },
    });

    const addMembroMutation = useMutation({
        mutationFn: async () => {
            const { data: profile, error: findError } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", email)
                .single();

            if (findError || !profile) {
                throw new Error("Usuário não encontrado. O colaborador deve se cadastrar no sistema primeiro.");
            }

            const { error } = await supabase.from("condominio_acessos").insert({
                condominio_id: id as string,
                user_id: profile.id,
                nivel_acesso: acesso as any,
                modulos_permitidos: permitidos as any
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipe", id] });
            setIsCreateOpen(false);
            setNome(""); setEmail("");
            toast({ title: "Acesso concedido!", description: "O novo membro já pode acessar os módulos liberados." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message })
    });

    const revokeAcessoMutation = useMutation({
        mutationFn: async (acessoId: string) => {
            const { error } = await supabase.from("condominio_acessos").delete().eq("id", acessoId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipe", id] });
            toast({ title: "Acesso revogado." });
        }
    });

    const toggleModulo = (modId: string) => {
        setPermitidos(prev =>
            prev.includes(modId) ? prev.filter(i => i !== modId) : [...prev, modId]
        );
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Carregando permissões...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Equipe & Acessos</h1>
                        <p className="text-muted-foreground mt-1">Delegue tarefas e controle quem pode ver cada módulo.</p>
                    </div>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-bold shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700">
                            <UserPlus className="mr-2 h-4 w-4" /> Convidar Colaborador
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>Liberar Acesso</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl flex gap-3 italic text-xs text-purple-700">
                                <Shield className="h-4 w-4 shrink-0" />
                                O colaborador deve possuir uma conta no SINDIPRO vinculada ao e-mail informado abaixo.
                            </div>
                            <div className="space-y-2">
                                <Label>E-mail do Colaborador</Label>
                                <Input type="email" placeholder="colaborador@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Nível de Acesso Global</Label>
                                <Select value={acesso} onValueChange={setAcesso}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="leitura">Somente Leitura</SelectItem>
                                        <SelectItem value="total">Edição Total</SelectItem>
                                        <SelectItem value="tarefas_only">Apenas Rondas/Tarefas (Zelador)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label>Módulos Liberados</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {modulesList.map(mod => (
                                        <div key={mod.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                            <Checkbox id={mod.id} checked={permitidos.includes(mod.id)} onCheckedChange={() => toggleModulo(mod.id)} />
                                            <Label htmlFor={mod.id} className="text-sm cursor-pointer">{mod.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={() => addMembroMutation.mutate()} disabled={!email || addMembroMutation.isPending}>
                                {addMembroMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Garantir Acesso"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {equipe?.map((mem) => (
                    <Card key={mem.id} className="group border-none shadow-sm bg-card/60 backdrop-blur-sm hover:shadow-md transition-all">
                        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center shadow-inner">
                                <Users className="h-7 w-7 text-muted-foreground/60" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-lg">{(mem.profile as any)?.full_name || "Membro da Equipe"}</p>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">{(mem.profile as any)?.role}</span>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Mail className="h-3.5 w-3.5" /> {(mem.profile as any)?.email}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {(mem.modulos_permitidos as string[])?.map((mId: string) => (
                                        <span key={mId} className="text-[9px] px-1.5 py-0.5 rounded bg-muted font-bold text-muted-foreground uppercase tracking-tighter">
                                            {modulesList.find(ml => ml.id === mId)?.label || mId}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-dashed">
                                <div className="text-right hidden md:block">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-0.5">Acesso</span>
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold flex items-center gap-1.5">
                                        <Shield className="h-3 w-3" /> {mem.nivel_acesso.replace('_', ' ')}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive opacity-40 group-hover:opacity-100 transition-opacity" onClick={() => revokeAcessoMutation.mutate(mem.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {equipe?.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/20">
                        <ShieldAlert className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-bold uppercase">Gestão Solitária</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">Ainda não há outros membros com acesso a este condomínio. Convide seu zelador ou assistente.</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-purple-500/5 rounded-xl border border-dashed border-purple-500/20 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                <p className="text-[11px] text-purple-800 leading-tight">
                    <strong>Níveis de acesso:</strong> Zeladores vinculados com "Apenas Rondas" verão uma interface simplificada no mobile ao logar, focada 100% na execução do roteiro diário.
                </p>
            </div>
        </div>
    );
};

export default Equipe;
