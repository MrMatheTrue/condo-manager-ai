import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, Calendar as CalendarIcon, Edit, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

type Criticidade = Database["public"]["Enums"]["criticidade"];
type StatusObrigacao = Database["public"]["Enums"]["status_obrigacao"];

interface Obrigacao {
    id: string;
    condominio_id: string;
    nome: string;
    descricao: string | null;
    data_ultima_realizacao: string | null;
    data_proxima_realizacao: string | null;
    periodicidade_dias: number;
    criticidade: Criticidade;
    dias_alerta_antecipado: number;
    responsavel_nome: string | null;
    observacoes: string | null;
    status: StatusObrigacao;
    created_at: string;
    updated_at: string;
}

interface FormFieldsProps {
    nome: string; setNome: (v: string) => void;
    descricao: string; setDescricao: (v: string) => void;
    dataUltima: string; setDataUltima: (v: string) => void;
    periodicidade: string; setPeriodicidade: (v: string) => void;
    criticidade: Criticidade; setCriticidade: (v: Criticidade) => void;
    alerta: string; setAlerta: (v: string) => void;
    responsavel: string; setResponsavel: (v: string) => void;
    obs: string; setObs: (v: string) => void;
}

function FormFields({
    nome, setNome, descricao, setDescricao, dataUltima, setDataUltima,
    periodicidade, setPeriodicidade, criticidade, setCriticidade,
    alerta, setAlerta, responsavel, setResponsavel, obs, setObs,
}: FormFieldsProps) {
    return (
        <div className="space-y-4 py-2">
            <div className="space-y-2">
                <Label>Nome da Obrigação *</Label>
                <Input placeholder="Ex: AVCB - Auto de Vistoria" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea placeholder="Detalhes sobre esta obrigação..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Criticidade</Label>
                    <Select value={criticidade} onValueChange={(v: Criticidade) => setCriticidade(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="critica">Crítica</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Periodicidade (dias)</Label>
                    <Select value={periodicidade} onValueChange={setPeriodicidade}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">Mensal (30)</SelectItem>
                            <SelectItem value="90">Trimestral (90)</SelectItem>
                            <SelectItem value="180">Semestral (180)</SelectItem>
                            <SelectItem value="365">Anual (365)</SelectItem>
                            <SelectItem value="730">Bianual (730)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Última Realização</Label>
                    <Input type="date" value={dataUltima} onChange={(e) => setDataUltima(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Alerta antecipado (dias)</Label>
                    <Select value={alerta} onValueChange={setAlerta}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="15">15 dias</SelectItem>
                            <SelectItem value="30">30 dias</SelectItem>
                            <SelectItem value="60">60 dias</SelectItem>
                            <SelectItem value="90">90 dias</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Responsável</Label>
                <Input placeholder="Nome do responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Notas adicionais..." value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────
const Obrigacoes = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { isColaborador } = useAuth();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingObrigacao, setEditingObrigacao] = useState<Obrigacao | null>(null);

    const [nome, setNome] = useState("");
    const [descricao, setDescricao] = useState("");
    const [dataUltima, setDataUltima] = useState("");
    const [periodicidade, setPeriodicidade] = useState("365");
    const [criticidade, setCriticidade] = useState<Criticidade>("media");
    const [alerta, setAlerta] = useState("30");
    const [responsavel, setResponsavel] = useState("");
    const [obs, setObs] = useState("");

    const formProps: FormFieldsProps = {
        nome, setNome, descricao, setDescricao, dataUltima, setDataUltima,
        periodicidade, setPeriodicidade, criticidade, setCriticidade,
        alerta, setAlerta, responsavel, setResponsavel, obs, setObs,
    };

    const { data: obrigacoes, isLoading, isError } = useQuery({
        queryKey: ["obrigacoes", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("obrigacoes")
                .select("*")
                .eq("condominio_id", id)
                .order("data_proxima_realizacao", { ascending: true });
            if (error) throw error;
            return data;
        },
        retry: 1,
        enabled: !!id,
    });

    const resetForm = () => {
        setNome(""); setDescricao(""); setDataUltima(""); setPeriodicidade("365");
        setCriticidade("media"); setAlerta("30"); setResponsavel(""); setObs("");
    };

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!id) throw new Error("Condomínio não identificado");
            const lastDate = dataUltima ? new Date(dataUltima) : new Date();
            const proxima = addDays(lastDate, parseInt(periodicidade));
            const { error } = await supabase.from("obrigacoes").insert({
                condominio_id: id,
                nome,
                descricao,
                data_ultima_realizacao: dataUltima || null,
                data_proxima_realizacao: proxima.toISOString().split("T")[0],
                periodicidade_dias: parseInt(periodicidade),
                criticidade,
                dias_alerta_antecipado: parseInt(alerta),
                responsavel_nome: responsavel || null,
                observacoes: obs || null,
                status: "em_dia",
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["obrigacoes", id] });
            setIsCreateOpen(false);
            resetForm();
            toast({ title: "Obrigação criada com sucesso!" });
        },
        onError: (err: Error) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingObrigacao) return;
            const lastDate = dataUltima ? new Date(dataUltima) : new Date();
            const proxima = addDays(lastDate, parseInt(periodicidade));
            const { error } = await supabase.from("obrigacoes").update({
                nome,
                descricao,
                data_ultima_realizacao: dataUltima || null,
                data_proxima_realizacao: proxima.toISOString().split("T")[0],
                periodicidade_dias: parseInt(periodicidade),
                criticidade,
                dias_alerta_antecipado: parseInt(alerta),
                responsavel_nome: responsavel || null,
                observacoes: obs || null,
            }).eq("id", editingObrigacao.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["obrigacoes", id] });
            setEditingObrigacao(null);
            resetForm();
            toast({ title: "Obrigação atualizada!" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const completeMutation = useMutation({
        mutationFn: async (obrigacaoId: string) => {
            const obrigacao = obrigacoes?.find((o) => o.id === obrigacaoId);
            if (!obrigacao) throw new Error("Obrigação não encontrada");
            const hoje = new Date();
            const proxima = addDays(hoje, obrigacao.periodicidade_dias);
            const { error } = await supabase.from("obrigacoes").update({
                data_ultima_realizacao: hoje.toISOString().split("T")[0],
                data_proxima_realizacao: proxima.toISOString().split("T")[0],
                status: "em_dia",
            }).eq("id", obrigacaoId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["obrigacoes", id] });
            toast({ title: "Obrigação marcada como realizada!" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (obrigacaoId: string) => {
            const { error } = await supabase.from("obrigacoes").delete().eq("id", obrigacaoId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["obrigacoes", id] });
            toast({ title: "Obrigação removida." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const openEdit = (o: Obrigacao) => {
        setEditingObrigacao(o);
        setNome(o.nome);
        setDescricao(o.descricao || "");
        setDataUltima(o.data_ultima_realizacao || "");
        setPeriodicidade(String(o.periodicidade_dias));
        setCriticidade(o.criticidade);
        setAlerta(String(o.dias_alerta_antecipado));
        setResponsavel(o.responsavel_nome || "");
        setObs(o.observacoes || "");
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            em_dia: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
            atencao: "bg-amber-500/10 text-amber-600 border-amber-200",
            vencida: "bg-red-500/10 text-red-600 border-red-200",
        };
        return map[status] ?? map["em_dia"];
    };

    const getCritBadge = (c: string) => {
        const map: Record<string, string> = {
            baixa: "bg-blue-500/10 text-blue-600",
            media: "bg-yellow-500/10 text-yellow-600",
            alta: "bg-orange-500/10 text-orange-600",
            critica: "bg-red-500/10 text-red-600",
        };
        return map[c] ?? "";
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Carregando obrigações...</p>
        </div>
    );

    if (isError) return (
        <div className="p-8 text-center space-y-4">
            <p className="font-bold text-destructive">Erro ao carregar obrigações.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Obrigações</h1>
                        <p className="text-muted-foreground mt-1">Controle de AVCB, Seguros, Limpezas e demais obrigações.</p>
                    </div>
                </div>
                {!isColaborador && (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="shadow-lg shadow-primary/20 font-bold">
                                <Plus className="mr-2 h-4 w-4" /> Nova Obrigação
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Nova Obrigação</DialogTitle></DialogHeader>
                            <FormFields {...formProps} />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !nome}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Criar Obrigação
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {obrigacoes?.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/20">
                    <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-bold">Nenhuma obrigação cadastrada</h3>
                    <p className="text-muted-foreground mt-1">Adicione as obrigações periódicas deste condomínio.</p>
                </div>
            ) : (
                <Card className="border-none shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Obrigação</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Criticidade</TableHead>
                                    <TableHead>Próx. Realização</TableHead>
                                    <TableHead>Responsável</TableHead>
                                    {!isColaborador && <TableHead className="text-right">Ações</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {obrigacoes?.map((o) => (
                                    <TableRow key={o.id}>
                                        <TableCell className="font-medium">{o.nome}</TableCell>
                                        <TableCell>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getStatusBadge(o.status)}`}>
                                                {o.status?.replace("_", " ")}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getCritBadge(o.criticidade)}`}>
                                                {o.criticidade}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {o.data_proxima_realizacao
                                                ? format(new Date(o.data_proxima_realizacao + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{o.responsavel_nome || "—"}</TableCell>
                                        {!isColaborador && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                                                        onClick={() => completeMutation.mutate(o.id)} title="Marcar como realizado">
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => deleteMutation.mutate(o.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Dialog
                open={!!editingObrigacao}
                onOpenChange={(open) => { if (!open) { setEditingObrigacao(null); resetForm(); } }}
            >
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Editar Obrigação</DialogTitle></DialogHeader>
                    <FormFields {...formProps} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditingObrigacao(null); resetForm(); }}>Cancelar</Button>
                        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !nome}>
                            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Obrigacoes;