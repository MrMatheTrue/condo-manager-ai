import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, Calendar as CalendarIcon, AlertCircle, Edit, Trash2, Loader2, Info, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const Obrigacoes = () => {
    const { id } = useParams();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingObrigacao, setEditingObrigacao] = useState<any>(null);

    // Form states
    const [nome, setNome] = useState("");
    const [descricao, setDescricao] = useState("");
    const [dataUltima, setDataUltima] = useState("");
    const [periodicidade, setPeriodicidade] = useState("365");
    const [criticidade, setCriticidade] = useState("media");
    const [alerta, setAlerta] = useState("30");
    const [responsavel, setResponsavel] = useState("");
    const [obs, setObs] = useState("");

    const { data: obrigacoes, isLoading } = useQuery({
        queryKey: ["obrigacoes", id],
        queryFn: async () => {
            const { data, error } = await supabase.from("obrigacoes").select("*").eq("condominio_id", id).order("data_proxima_realizacao", { ascending: true });
            if (error) throw error;
            return data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const lastDate = dataUltima ? new Date(dataUltima) : new Date();
            const nextDate = addDays(lastDate, parseInt(periodicidade));

            const payload = {
                condominio_id: id,
                nome,
                descricao,
                data_ultima_realizacao: dataUltima || null,
                data_proxima_realizacao: nextDate.toISOString().split('T')[0],
                periodicidade_dias: parseInt(periodicidade),
                criticidade: criticidade as any,
                dias_alerta_antecipado: parseInt(alerta),
                responsavel_nome: responsavel,
                observacoes: obs,
                status: 'em_dia' as any
            };

            const { error } = await supabase.from("obrigacoes").insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["obrigacoes", id] });
            resetForm();
            setIsCreateOpen(false);
            toast({ title: "Obrigação criada com sucesso!" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message })
    });

    const registerRealization = useMutation({
        mutationFn: async (o: any) => {
            const now = new Date();
            const nextDate = addDays(now, o.periodicidade_dias);

            const { error } = await supabase.from("obrigacoes").update({
                data_ultima_realizacao: now.toISOString().split('T')[0],
                data_proxima_realizacao: nextDate.toISOString().split('T')[0],
                status: 'em_dia'
            }).eq("id", o.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["obrigacoes", id] });
            toast({ title: "Realização registrada!", description: "Data atualizada e próximo vencimento recalculado." });
        },
    });

    const resetForm = () => {
        setNome(""); setDescricao(""); setDataUltima(""); setPeriodicidade("365");
        setCriticidade("media"); setAlerta("30"); setResponsavel(""); setObs("");
        setEditingObrigacao(null);
    };

    const formatDateBR = (dateStr: string) => {
        if (!dateStr) return "-";
        return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Carregando obrigações...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Obrigações</h1>
                        <p className="text-muted-foreground mt-1">Manutenção preventiva e prazos legais do condomínio.</p>
                    </div>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-orange-500/20 bg-orange-600 hover:bg-orange-700">
                            <Plus className="mr-2 h-4 w-4" /> Nova Obrigação
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Cadastrar Obrigação</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Nome da Obrigação</Label>
                                <Input placeholder="Ex: Recarga de Extintores" value={nome} onChange={(e) => setNome(e.target.value)} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Descrição</Label>
                                <Textarea placeholder="Detalhes sobre a obrigação..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Última Realização</Label>
                                <Input type="date" value={dataUltima} onChange={(e) => setDataUltima(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Periodicidade (dias)</Label>
                                <Input type="number" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Criticidade</Label>
                                <Select value={criticidade} onValueChange={setCriticidade}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="baixa">Baixa</SelectItem>
                                        <SelectItem value="media">Média</SelectItem>
                                        <SelectItem value="alta">Alta</SelectItem>
                                        <SelectItem value="critica">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Alerta antecipado (dias)</Label>
                                <Input type="number" value={alerta} onChange={(e) => setAlerta(e.target.value)} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Responsável (Nome/Empresa)</Label>
                                <Input placeholder="Ex: ABC Extintores LTDA" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Obrigação"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="font-bold">Obrigação</TableHead>
                                <TableHead className="font-bold">Última</TableHead>
                                <TableHead className="font-bold">Próxima</TableHead>
                                <TableHead className="font-bold">Criticidade</TableHead>
                                <TableHead className="font-bold">Status</TableHead>
                                <TableHead className="text-right font-bold">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {obrigacoes?.map((o) => (
                                <TableRow key={o.id} className="hover:bg-muted/20 transition-colors">
                                    <TableCell>
                                        <div className="font-bold text-foreground">{o.nome}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-1">{o.descricao || "Sem descrição"}</div>
                                    </TableCell>
                                    <TableCell className="text-sm">{formatDateBR(o.data_ultima_realizacao)}</TableCell>
                                    <TableCell className="text-sm font-medium">{formatDateBR(o.data_proxima_realizacao)}</TableCell>
                                    <TableCell>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${o.criticidade === 'critica' ? 'bg-red-500/10 text-red-600 border-red-200' :
                                            o.criticidade === 'alta' ? 'bg-orange-500/10 text-orange-600 border-orange-200' :
                                                'bg-blue-500/10 text-blue-600 border-blue-200'
                                            }`}>
                                            {o.criticidade}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`flex items-center gap-1.5 text-xs font-bold ${o.status === "vencida" ? "text-red-500" :
                                            o.status === "atencao" ? "text-orange-500" : "text-emerald-500"
                                            }`}>
                                            {o.status === 'vencida' ? <AlertCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                            {o.status.replace('_', ' ').toUpperCase()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => registerRealization.mutate(o)} title="Registrar Realização Hoje">
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {obrigacoes?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <CalendarIcon className="h-12 w-12 text-muted-foreground/30" />
                                            <p className="text-muted-foreground font-medium">Nenhuma obrigação cadastrada para este condomínio.</p>
                                            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>Criar primeira obrigação</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Dica SINDIPRO:</strong> As próximas datas são calculadas automaticamente com base na periodicidade informada.
                    Você será alertado com antecedência conforme definido em cada obrigação.
                </p>
            </div>
        </div>
    );
};

export default Obrigacoes;
