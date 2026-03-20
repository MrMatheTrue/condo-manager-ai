import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, User, Bell, Shield, LogOut, Loader2, Save, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Configuracoes = () => {
    const { user, signOut } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id
    });

    const [nome, setNome] = useState("");
    const [telefone, setTelefone] = useState("");

    const updateMutation = useMutation({
        mutationFn: async () => {
            setIsUpdating(true);
            const { error } = await supabase.from("profiles").update({
                full_name: nome || profile?.full_name,
                phone: telefone || profile?.phone
            }).eq("id", user?.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
            toast({ title: "Perfil atualizado!" });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
        onSettled: () => setIsUpdating(false)
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Carregando configurações...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Settings className="h-8 w-8 text-primary" /> Configurações
                </h1>
                <p className="text-muted-foreground mt-1">Gerencie seu perfil e preferências de conta.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Lateral Navigation */}
                <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start font-bold bg-primary/5 text-primary">
                        <User className="mr-2 h-4 w-4" /> Perfil de Usuário
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground" disabled>
                        <Bell className="mr-2 h-4 w-4" /> Notificações
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground" disabled>
                        <Shield className="mr-2 h-4 w-4" /> Segurança & Senha
                    </Button>
                    <div className="pt-4 mt-4 border-t">
                        <Button
                            variant="destructive"
                            className="w-full justify-start font-bold bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white border-none"
                            onClick={() => signOut()}
                        >
                            <LogOut className="mr-2 h-4 w-4" /> Encerrar Sessão
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl font-bold">Informações do Perfil</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-6 pb-6 border-b border-dashed">
                                <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center relative group cursor-pointer">
                                    <User className="h-10 w-10 text-primary" />
                                    <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Camera className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-lg">{profile?.full_name || "Usuário"}</p>
                                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{(profile as any)?.role}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="nome">Nome Completo</Label>
                                    <Input
                                        id="nome"
                                        defaultValue={profile?.full_name}
                                        onChange={(e) => setNome(e.target.value)}
                                        className="h-11 shadow-sm border-none bg-muted/30 focus-visible:ring-primary"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="tel">Telefone / WhatsApp</Label>
                                    <Input
                                        id="tel"
                                        defaultValue={profile?.phone}
                                        onChange={(e) => setTelefone(e.target.value)}
                                        className="h-11 shadow-sm border-none bg-muted/30 focus-visible:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button
                                    className="font-bold shadow-lg shadow-primary/20 px-8"
                                    onClick={() => updateMutation.mutate()}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-orange-500/5 text-orange-800">
                        <CardContent className="p-4 flex gap-4 items-start">
                            <Shield className="h-5 w-5 mt-1 shrink-0" />
                            <div className="space-y-1">
                                <p className="font-bold text-sm">Privacidade de Dados</p>
                                <p className="text-[11px] leading-relaxed">
                                    Suas informações são armazenadas de forma criptografada nos servidores da Supabase.
                                    O SINDIPRO utiliza RLS (Row Level Security) para garantir que apenas você e os administradores
                                    autorizados vejam seus dados.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Configuracoes;
