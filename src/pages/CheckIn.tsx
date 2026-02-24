import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Clock, Camera, Plus, History, Settings, Loader2, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CheckIn = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCaptureOpen, setIsCaptureOpen] = useState(false);
    const [selectedTarefa, setSelectedTarefa] = useState<any>(null);

    // Task creation states
    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [frequencia, setFrequencia] = useState("diaria");
    const [horario, setHorario] = useState("");

    // Execution states
    const [obs, setObs] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { data: tarefas, isLoading: loadingTarefas } = useQuery({
        queryKey: ["tarefas-checkin", id],
        queryFn: async () => {
            const { data, error } = await supabase.from("tarefas_checkin").select("*").eq("condominio_id", id).order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { data: execucoes, isLoading: loadingExecs } = useQuery({
        queryKey: ["execucoes-all", id],
        queryFn: async () => {
            // Correcting join for profiles
            const { data, error } = await supabase
                .from("execucoes_checkin")
                .select("*, profile:profiles(full_name)")
                .eq("condominio_id", id)
                .order("data_execucao", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const createTarefaMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("tarefas_checkin").insert({
                condominio_id: id as string,
                titulo,
                descricao,
                frequencia: frequencia as any,
                horario_previsto: horario || null,
                criado_por: user?.id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tarefas-checkin", id] });
            setIsCreateOpen(false);
            setTitulo(""); setDescricao("");
            toast({ title: "Tarefa agendada!" });
        }
    });

    const completeTarefaMutation = useMutation({
        mutationFn: async () => {
            setIsUploading(true);
            let fotoUrl = "";
            const { data: { user } } = await supabase.auth.getUser();

            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${id}/${Math.random()}.${fileExt}`;
                const { data, error } = await supabase.storage.from("fotos-checkin").upload(fileName, file);
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from("fotos-checkin").getPublicUrl(data.path);
                fotoUrl = publicUrl;
            }

            const { error } = await supabase.from("execucoes_checkin").insert({
                tarefa_id: selectedTarefa.id,
                condominio_id: id as string,
                executado_por: user?.id,
                status: 'concluida' as any,
                observacao: obs,
                fotos_urls: (fotoUrl ? [fotoUrl] : []) as any
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["execucoes-all", id] });
            setIsCaptureOpen(false);
            setObs(""); setFile(null);
            toast({ title: "Check-in realizado!", description: "A execução foi registrada com sucesso." });
        },
        onSettled: () => setIsUploading(false)
    });

    if (loadingTarefas || loadingExecs) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Sincronizando tarefas operacionais...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Check-in Operacional</h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base">Controle de rondas e tarefas diárias da equipe.</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="execucao" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-muted/50 p-1">
                    <TabsTrigger value="execucao" className="font-bold border-none data-[state=active]:shadow-md">Execução Hoje</TabsTrigger>
                    <TabsTrigger value="gestao" className="font-bold border-none data-[state=active]:shadow-md">Gestão & Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="execucao" className="space-y-4 outline-none">
                    <div className="grid gap-4">
                        {tarefas?.filter(t => t.status_ativo).map((tarefa) => {
                            const today = new Date().toISOString().split('T')[0];
                            const foiExecutadaHoje = execucoes?.some(e => e.tarefa_id === tarefa.id && e.data_execucao.startsWith(today));

                            return (
                                <Card key={tarefa.id} className={`group border-none shadow-sm transition-all duration-300 ${foiExecutadaHoje ? 'bg-success/5 opacity-80' : 'bg-card/60 backdrop-blur-sm'}`}>
                                    <CardContent className="p-4 md:p-6 flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${foiExecutadaHoje ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}>
                                            {foiExecutadaHoje ? <CheckCircle2 className="h-8 w-8" /> : <Circle className="h-8 w-8" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-lg font-bold truncate ${foiExecutadaHoje ? 'text-success/70 line-through' : 'text-foreground'}`}>{tarefa.titulo}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs font-medium text-muted-foreground">
                                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {tarefa.horario_previsto || "Livre"}</span>
                                                <span className="uppercase tracking-widest px-1.5 py-0.5 rounded bg-muted/50">{tarefa.frequencia}</span>
                                            </div>
                                        </div>
                                        {!foiExecutadaHoje && (
                                            <Button
                                                className="shadow-md bg-primary hover:bg-primary/90 font-bold px-6"
                                                onClick={() => { setSelectedTarefa(tarefa); setIsCaptureOpen(true); }}
                                            >
                                                <Camera className="mr-2 h-4 w-4" /> Registrar
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {tarefas?.length === 0 && (
                            <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/20">
                                <Settings className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-bold uppercase tracking-tight">Nenhuma tarefa ativa</h3>
                                <p className="text-muted-foreground text-sm">Vá na guia Gestão para criar o roteiro operacional.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="gestao" className="space-y-8 outline-none">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5" /> Configuração do Roteiro</h2>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="font-bold"><Plus className="h-4 w-4 mr-2" /> Nova Tarefa</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Criar Nova Tarefa Operacional</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Título da Tarefa</Label>
                                        <Input placeholder="Ex: Verificação de Bomba de Recalque" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Descrição / Instruções</Label>
                                        <Textarea placeholder="Passo a passo para o zelador..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Frequência</Label>
                                            <Select value={frequencia} onValueChange={setFrequencia}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="diaria">Diária</SelectItem>
                                                    <SelectItem value="semanal">Semanal</SelectItem>
                                                    <SelectItem value="mensal">Mensal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Horário Previsto</Label>
                                            <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                    <Button onClick={() => createTarefaMutation.mutate()} disabled={!titulo}>Salvar Roteiro</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4">
                        {tarefas?.map(t => (
                            <Card key={t.id} className="border-none bg-muted/30 shadow-sm">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold">{t.titulo}</p>
                                        <p className="text-xs text-muted-foreground">{t.frequencia} · {t.horario_previsto || "Qualquer horário"}</p>
                                    </div>
                                    <Button variant="ghost" size="sm">Editar</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 px-1"><History className="h-5 w-5" /> Histórico de Execuções</h2>
                        <div className="grid gap-3">
                            {execucoes?.map(e => (
                                <Card key={e.id} className="border-none bg-card shadow-sm overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-success/10 text-success">
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{tarefas?.find(t => t.id === e.tarefa_id)?.titulo}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                                        {format(new Date(e.data_execucao), "dd/MM/yyyy HH:mm", { locale: ptBR })} · {(e.profile as any)?.full_name || "Membro da Equipe"}
                                                    </p>
                                                </div>
                                            </div>
                                            {(e.fotos_urls as any[])?.length > 0 && <ImageIcon className="h-4 w-4 text-primary" />}
                                        </div>
                                        {e.observacao && (
                                            <div className="px-4 pb-4 text-xs italic text-muted-foreground border-t pt-2 bg-muted/10">
                                                "{e.observacao}"
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modal de Execução (Capture) */}
            <Dialog open={isCaptureOpen} onOpenChange={setIsCaptureOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-primary" /> Registrar Execução
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-muted rounded-xl text-sm font-bold text-center border">
                            {selectedTarefa?.titulo}
                        </div>
                        <div className="space-y-2">
                            <Label>Observação (Opcional)</Label>
                            <Textarea placeholder="Alguma anormalidade ou detalhe?" value={obs} onChange={(e) => setObs(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Foto da Execução (Obrigatório para auditoria)</Label>
                            <div className="relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer">
                                <Input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    accept="image/*"
                                    capture="environment"
                                />
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                <p className="text-xs font-bold text-muted-foreground">{file ? file.name : "Toque para tirar foto"}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="w-full" onClick={() => setIsCaptureOpen(false)}>Cancelar</Button>
                        <Button className="w-full font-bold h-12" onClick={() => completeTarefaMutation.mutate()} disabled={isUploading || !file}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalizar Check-in"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CheckIn;
