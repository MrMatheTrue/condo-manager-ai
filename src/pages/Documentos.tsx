import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Plus, Search, Trash2, Loader2, Upload, Link as LinkIcon, ArrowLeft, Eye, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Documentos = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<any>(null);

    // Form states
    const [nome, setNome] = useState("");
    const [tipo, setTipo] = useState("Ata de Assembleia");
    const [fonte, setFonte] = useState<"upload" | "drive_url">("upload");
    const [driveUrl, setDriveUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { data: docs, isLoading } = useQuery({
        queryKey: ["documentos", id],
        queryFn: async () => {
            const { data, error } = await supabase.from("documentos").select("*").eq("condominio_id", id).order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (fonte === "upload" && !file) throw new Error("Selecione um arquivo");

            setIsUploading(true);
            let finalUrl = "";
            let size = 0;
            let ext = "";

            if (fonte === "upload" && file) {
                // Restrict to PDF and Images
                const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    throw new Error("Apenas PDF e Imagens (JPG, PNG, WEBP) são permitidos.");
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${id}/${Math.random()}.${fileExt}`;
                const { data, error } = await supabase.storage.from("documentos").upload(fileName, file);

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage.from("documentos").getPublicUrl(data.path);
                finalUrl = publicUrl;
                size = file.size;
                ext = fileExt || "";
            } else {
                finalUrl = driveUrl;
            }

            const { error: dbError } = await supabase.from("documentos").insert({
                condominio_id: id,
                nome,
                tipo_documento: tipo,
                fonte,
                arquivo_url: fonte === "upload" ? finalUrl : null,
                drive_url: fonte === "drive_url" ? finalUrl : null,
                tamanho_bytes: size,
                extensao: ext,
                uploaded_by: (await supabase.auth.getUser()).data.user?.id
            });

            if (dbError) throw dbError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documentos", id] });
            resetForm();
            setIsCreateOpen(false);
            toast({ title: "Documento adicionado!" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
        onSettled: () => setIsUploading(false)
    });

    const deleteMutation = useMutation({
        mutationFn: async (doc: any) => {
            if (doc.fonte === 'upload' && doc.arquivo_url) {
                const path = doc.arquivo_url.split('/storage/v1/object/public/documentos/')[1];
                if (path) await supabase.storage.from("documentos").remove([path]);
            }
            const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documentos", id] });
            toast({ title: "Documento excluído." });
        }
    });

    const resetForm = () => {
        setNome(""); setTipo("Ata de Assembleia"); setFonte("upload");
        setDriveUrl(""); setFile(null);
    };

    const filteredDocs = docs?.filter(d => d.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Sincronizando arquivos...</p>
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
                        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
                        <p className="text-muted-foreground mt-1">Gestão centralizada de arquivos e links externos.</p>
                    </div>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 font-bold">
                            <Plus className="mr-2 h-4 w-4" /> Adicionar Documento
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>Novo Documento</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Documento</Label>
                                <Input placeholder="Ex: Ata de AGO Março 2024" value={nome} onChange={(e) => setNome(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Documento</Label>
                                <Select value={tipo} onValueChange={setTipo}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ata de Assembleia">Ata de Assembleia</SelectItem>
                                        <SelectItem value="Apólice de Seguro">Apólice de Seguro</SelectItem>
                                        <SelectItem value="Convenção">Convenção</SelectItem>
                                        <SelectItem value="Regimento Interno">Regimento Interno</SelectItem>
                                        <SelectItem value="Contrato Social">Contrato Social</SelectItem>
                                        <SelectItem value="Outros">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 pb-2">
                                <Label>Fonte</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={fonte === "upload" ? "default" : "outline"}
                                        className="flex-1"
                                        onClick={() => setFonte("upload")}
                                        type="button"
                                    >
                                        <Upload className="mr-2 h-4 w-4" /> Arquivo
                                    </Button>
                                    <Button
                                        variant={fonte === "drive_url" ? "default" : "outline"}
                                        className="flex-1"
                                        onClick={() => setFonte("drive_url")}
                                        type="button"
                                    >
                                        <LinkIcon className="mr-2 h-4 w-4" /> link Drive
                                    </Button>
                                </div>
                            </div>

                            {fonte === "upload" ? (
                                <div className="space-y-2">
                                    <Label>Arquivo (Apenas PDF ou Imagem)</Label>
                                    <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                    <p className="text-[10px] text-muted-foreground italic">Arquivos maiores que 5MB podem demorar a carregar.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>URL do Google Drive / Link Externo</Label>
                                    <Input placeholder="https://drive.google.com/..." value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={() => uploadMutation.mutate()} disabled={isUploading || !nome}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Documento"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nome do documento..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocs?.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-all duration-300 border-none bg-card/50 backdrop-blur-sm group overflow-hidden">
                        <CardContent className="p-5 flex items-center gap-4 relative">
                            <div className={`p-4 rounded-xl shadow-inner ${doc.fonte === 'upload' ? 'bg-primary/5 text-primary' : 'bg-emerald-500/5 text-emerald-600'}`}>
                                <FileText className="h-8 w-8" />
                            </div>
                            <div className="flex-1 min-w-0 pr-10">
                                <p className="font-bold truncate text-foreground group-hover:text-primary transition-colors">{doc.nome}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{doc.tipo_documento}</span>
                                    <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                                </div>
                            </div>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {doc.fonte === 'upload' && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setPreviewDoc(doc)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                    <a href={doc.arquivo_url || doc.drive_url} target="_blank" rel="noreferrer">
                                        {doc.fonte === 'upload' ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                    </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(doc)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredDocs?.length === 0 && (
                    <div className="col-span-full text-center py-20 border-2 border-dashed rounded-2xl bg-muted/20">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-bold">Nenhum documento encontrado</h3>
                        <p className="text-muted-foreground mt-1">Adicione arquivos importantes aqui para acesso rápido.</p>
                    </div>
                )}
            </div>

            {/* Preview Dialog */}
            <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden flex flex-col">
                    <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
                        <DialogTitle className="truncate pr-8">{previewDoc?.nome}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 bg-muted/20 relative">
                        {previewDoc?.extensao?.toLowerCase() === 'pdf' ? (
                            <iframe src={previewDoc?.arquivo_url} className="w-full h-full border-none" title="PDF Preview" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-4">
                                <img src={previewDoc?.arquivo_url} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t flex justify-end gap-2 bg-card">
                        <Button variant="outline" asChild>
                            <a href={previewDoc?.arquivo_url} download target="_blank" rel="noreferrer">
                                <Download className="mr-2 h-4 w-4" /> Baixar
                            </a>
                        </Button>
                        <Button onClick={() => setPreviewDoc(null)}>Fechar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Documentos;
