import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Camera, Plus, Loader2, ArrowLeft, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

const MAX_PHOTOS = 3;

// ── Formulário criação de tarefa (fora do componente principal) ───────────────
interface CreateFormProps {
    titulo: string; setTitulo: (v: string) => void;
    descricao: string; setDescricao: (v: string) => void;
    frequencia: string; setFrequencia: (v: string) => void;
    horario: string; setHorario: (v: string) => void;
    onSave: () => void; onCancel: () => void; loading: boolean;
}
function CreateTarefaForm(p: CreateFormProps) {
    return (
        <>
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input placeholder="Ex: Verificação de extintores" value={p.titulo} onChange={e => p.setTitulo(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea placeholder="Detalhes da tarefa..." value={p.descricao} onChange={e => p.setDescricao(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Frequência</Label>
                        <Select value={p.frequencia} onValueChange={p.setFrequencia}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="diaria">Diária</SelectItem>
                                <SelectItem value="semanal">Semanal</SelectItem>
                                <SelectItem value="mensal">Mensal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Horário previsto</Label>
                        <Input type="time" value={p.horario} onChange={e => p.setHorario(e.target.value)} />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={p.onCancel}>Cancelar</Button>
                <Button onClick={p.onSave} disabled={!p.titulo || p.loading}>
                    {p.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar Tarefa
                </Button>
            </DialogFooter>
        </>
    );
}

// ── CheckIn principal ─────────────────────────────────────────────────────────
const CheckIn = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { isSindico } = useAuth();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCaptureOpen, setIsCaptureOpen] = useState(false);
    const [selectedTarefa, setSelectedTarefa] = useState<any>(null);
    const [titulo, setTitulo] = useState(""); const [descricao, setDescricao] = useState("");
    const [frequencia, setFrequencia] = useState("diaria"); const [horario, setHorario] = useState("");
    const [obs, setObs] = useState(""); const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: tarefas, isLoading: loadingTarefas, isError: erroTarefas } = useQuery({
        queryKey: ["tarefas-checkin", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tarefas_checkin")
                .select("id, titulo, descricao, frequencia, horario_previsto, status_ativo, condominio_id, criado_por, created_at")
                .eq("condominio_id", id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data ?? [];
        },
        retry: 1, enabled: !!id,
    });

    // ✅ FIX: Removido "profile:profiles(full_name)" — join em profiles bloqueado por RLS → 400 → loop eterno
    const { data: execucoes, isLoading: loadingExecs, isError: erroExecs } = useQuery({
        queryKey: ["execucoes-all", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("execucoes_checkin")
                .select("id, tarefa_id, condominio_id, executado_por, data_execucao, status, observacao, fotos_urls")
                .eq("condominio_id", id)
                .order("data_execucao", { ascending: false });
            if (error) throw error;
            return data ?? [];
        },
        retry: 1, enabled: !!id,
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("tarefas_checkin").insert({
                condominio_id: id as string, titulo, descricao,
                frequencia: frequencia as any,
                horario_previsto: horario || null,
                status_ativo: true, criado_por: user?.id,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tarefas-checkin", id] });
            setIsCreateOpen(false); setTitulo(""); setDescricao("");
            toast({ title: "Tarefa criada!" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ tarefaId, ativo }: { tarefaId: string; ativo: boolean }) => {
            const { error } = await supabase.from("tarefas_checkin").update({ status_ativo: ativo }).eq("id", tarefaId);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarefas-checkin", id] }),
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (tarefaId: string) => {
            const { error } = await supabase.from("tarefas_checkin").delete().eq("id", tarefaId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tarefas-checkin", id] });
            toast({ title: "Tarefa removida." });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
    });

    const completeMutation = useMutation({
        mutationFn: async () => {
            setIsUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const fotosUrls: string[] = [];
            for (const file of files) {
                const ext = file.name.split(".").pop();
                const name = `${id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { data, error } = await supabase.storage.from("fotos-checkin").upload(name, file);
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from("fotos-checkin").getPublicUrl(data.path);
                fotosUrls.push(publicUrl);
            }
            const { error } = await supabase.from("execucoes_checkin").insert({
                tarefa_id: selectedTarefa.id, condominio_id: id as string,
                executado_por: user?.id, status: "concluida" as any,
                observacao: obs, fotos_urls: fotosUrls as any,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["execucoes-all", id] });
            setIsCaptureOpen(false); setObs(""); setFiles([]);
            toast({ title: "Check-in registrado!" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
        onSettled: () => setIsUploading(false),
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const added = Array.from(e.target.files || []);
        setFiles(prev => {
            const all = [...prev, ...added];
            if (all.length > MAX_PHOTOS) { toast({ variant: "destructive", title: `Máximo ${MAX_PHOTOS} fotos` }); return prev; }
            return all;
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (loadingTarefas || loadingExecs) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Sincronizando tarefas operacionais...</p>
        </div>
    );

    if (erroTarefas || erroExecs) return (
        <div className="p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="font-bold text-destructive">Erro ao carregar dados do check-in.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
    );

    const today = new Date().toISOString().split("T")[0];
    const tarefasAtivas = (tarefas ?? []).filter(t => t.status_ativo !== false);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Check-in Operacional</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Controle de rondas e tarefas diárias.</p>
                </div>
            </div>

            {isSindico ? (
                <Tabs defaultValue="execucao" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-muted/50 p-1">
                        <TabsTrigger value="execucao" className="font-bold">Execução Hoje</TabsTrigger>
                        <TabsTrigger value="gestao" className="font-bold">Gestão & Histórico</TabsTrigger>
                    </TabsList>
                    <TabsContent value="execucao">
                        <TarefasHoje tarefas={tarefasAtivas} execucoes={execucoes} today={today}
                            onRegistrar={t => { setSelectedTarefa(t); setIsCaptureOpen(true); }} />
                    </TabsContent>
                    <TabsContent value="gestao" className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Tarefas Cadastradas</h2>
                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <Button className="font-bold"><Plus className="mr-2 h-4 w-4" /> Nova Tarefa</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[440px]">
                                    <DialogHeader><DialogTitle>Nova Tarefa Operacional</DialogTitle></DialogHeader>
                                    <CreateTarefaForm titulo={titulo} setTitulo={setTitulo} descricao={descricao}
                                        setDescricao={setDescricao} frequencia={frequencia} setFrequencia={setFrequencia}
                                        horario={horario} setHorario={setHorario}
                                        onSave={() => createMutation.mutate()} onCancel={() => setIsCreateOpen(false)}
                                        loading={createMutation.isPending} />
                                </DialogContent>
                            </Dialog>
                        </div>
                        {(tarefas?.length ?? 0) === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
                                <p className="font-bold text-muted-foreground">Nenhuma tarefa criada ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tarefas?.map(t => {
                                    const last = execucoes?.find(e => e.tarefa_id === t.id);
                                    return (
                                        <Card key={t.id} className="border-none shadow-sm bg-card/60">
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-bold truncate ${!t.status_ativo ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">
                                                        {t.frequencia}{t.horario_previsto ? ` · ${t.horario_previsto}` : ""}
                                                        {last ? ` · Última: ${format(new Date(last.data_execucao), "dd/MM HH:mm", { locale: ptBR })}` : ""}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Button variant="outline" size="sm" className="text-xs"
                                                        onClick={() => toggleMutation.mutate({ tarefaId: t.id, ativo: !t.status_ativo })}>
                                                        {t.status_ativo ? "Desativar" : "Ativar"}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => deleteMutation.mutate(t.id)}>Excluir</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                        {(execucoes?.length ?? 0) > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-xl font-bold">Histórico de Execuções</h2>
                                {execucoes?.slice(0, 20).map(e => {
                                    const tarefa = tarefas?.find(t => t.id === e.tarefa_id);
                                    const fotos: string[] = Array.isArray(e.fotos_urls) ? e.fotos_urls : [];
                                    return (
                                        <Card key={e.id} className="border-none shadow-sm bg-card/60">
                                            <CardContent className="p-4 flex items-start gap-3">
                                                <div className={`p-2 rounded-xl shrink-0 ${e.status === "concluida" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm">{tarefa?.titulo ?? "Tarefa removida"}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(e.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                    {e.observacao && <p className="text-xs italic text-muted-foreground mt-1">"{e.observacao}"</p>}
                                                    {fotos.length > 0 && (
                                                        <div className="flex gap-1 mt-2">
                                                            {fotos.slice(0, 3).map((url, i) => (
                                                                <a href={url} target="_blank" rel="noreferrer" key={i}>
                                                                    <img src={url} alt="" className="h-12 w-12 rounded-lg object-cover border" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            ) : (
                <TarefasHoje tarefas={tarefasAtivas} execucoes={execucoes} today={today}
                    onRegistrar={t => { setSelectedTarefa(t); setIsCaptureOpen(true); }} />
            )}

            {/* Modal execução */}
            <Dialog open={isCaptureOpen} onOpenChange={open => { setIsCaptureOpen(open); if (!open) { setObs(""); setFiles([]); } }}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-primary" /> Registrar Execução
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-muted rounded-xl text-sm font-bold text-center border">{selectedTarefa?.titulo}</div>
                        <div className="space-y-2">
                            <Label>Observação (opcional)</Label>
                            <Textarea placeholder="Alguma anormalidade?" value={obs} onChange={e => setObs(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Fotos (máx. {MAX_PHOTOS})</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {files.map((f, i) => (
                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted border">
                                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                                        <button className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center"
                                            onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>
                                            <X className="h-3 w-3 text-white" />
                                        </button>
                                    </div>
                                ))}
                                {files.length < MAX_PHOTOS && (
                                    <button className="aspect-square rounded-lg border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary/60 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}>
                                        <Camera className="h-6 w-6 text-primary/50" />
                                        <p className="text-[10px] text-muted-foreground">Adicionar foto</p>
                                    </button>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setIsCaptureOpen(false)}>Cancelar</Button>
                        <Button className="flex-1 font-bold h-11" onClick={() => completeMutation.mutate()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Finalizar Check-in
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

function TarefasHoje({ tarefas, execucoes, today, onRegistrar }: {
    tarefas: any[]; execucoes: any[] | undefined; today: string; onRegistrar: (t: any) => void;
}) {
    if (tarefas.length === 0) return (
        <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/20">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-bold">Nenhuma tarefa ativa</p>
            <p className="text-sm text-muted-foreground mt-1">O síndico ainda não criou tarefas para este condomínio.</p>
        </div>
    );
    return (
        <div className="grid gap-4">
            {tarefas.map(tarefa => {
                const done = execucoes?.some(e => e.tarefa_id === tarefa.id && typeof e.data_execucao === "string" && e.data_execucao.startsWith(today));
                return (
                    <Card key={tarefa.id} className={`border-none shadow-sm transition-all ${done ? "bg-success/5 opacity-80" : "bg-card/60"}`}>
                        <CardContent className="p-4 md:p-6 flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${done ? "bg-success/20 text-success" : "bg-primary/10 text-primary"}`}>
                                {done ? <CheckCircle2 className="h-8 w-8" /> : <Circle className="h-8 w-8" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-lg font-bold truncate ${done ? "line-through text-muted-foreground" : ""}`}>{tarefa.titulo}</p>
                                {tarefa.descricao && <p className="text-sm text-muted-foreground truncate">{tarefa.descricao}</p>}
                                {tarefa.horario_previsto && <p className="text-xs text-muted-foreground mt-1">Previsto: {tarefa.horario_previsto}</p>}
                            </div>
                            {!done && (
                                <Button size="sm" className="shrink-0 font-bold" onClick={() => onRegistrar(tarefa)}>
                                    <Camera className="mr-2 h-4 w-4" /> Registrar
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

export default CheckIn;