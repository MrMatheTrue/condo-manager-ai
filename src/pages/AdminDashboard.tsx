import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Users, ShieldAlert, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
    const [search, setSearch] = useState("");
    const { toast } = useToast();

    const { data: stats } = useQuery({
        queryKey: ["admin-stats"],
        queryFn: async () => {
            const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
            const { count: condoCount } = await supabase.from("condominios").select("*", { count: "exact", head: true });
            const { count: obrCount } = await supabase.from("obrigacoes").select("*", { count: "exact", head: true });
            return { userCount, condoCount, obrCount };
        }
    });

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ["admin-users", search],
        queryFn: async () => {
            let query = supabase.from("profiles").select(`
        *,
        user_roles(role)
      `);

            if (search) {
                query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        }
    });

    const { data: condominios } = useQuery({
        queryKey: ["admin-condos"],
        queryFn: async () => {
            const { data, error } = await supabase.from("condominios").select("*");
            if (error) throw error;
            // Fetch sindico names separately to avoid RLS join issues
            const sindicoIds = [...new Set(data.map(c => c.sindico_id))];
            const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", sindicoIds);
            const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
            return data.map(c => ({ ...c, sindico_name: profileMap[c.sindico_id] || "Desconhecido" }));
        }
    });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Painel de Administração Macro</h1>
                    <p className="text-muted-foreground">Visão geral de todos os dados da plataforma SíndicoOS</p>
                </div>
                <Badge variant="outline" className="px-4 py-1 border-primary text-primary font-bold">
                    SUPER ADMIN
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card/50 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.userCount || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Condomínios Ativos</CardTitle>
                        <Building2 className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.condoCount || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Obrigações Monitoradas</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.obrCount || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Macro de Clientes e Usuários
                    </CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por nome ou e-mail..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>E-mail</TableHead>
                                <TableHead>Cargo/Role</TableHead>
                                <TableHead>Data Cadastro</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map((u) => (
                                <TableRow key={u.id} className="hover:bg-primary/5 transition-colors">
                                    <TableCell className="font-medium">{u.full_name}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">
                                            {(u as any).role || "sem cargo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(u.created_at).toLocaleDateString("pt-BR")}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => toast({ title: "Modo Edição", description: "O Admin pode editar qualquer campo diretamente." })}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Todos os Condomínios
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Condomínio</TableHead>
                                <TableHead>Síndico Responsável</TableHead>
                                <TableHead>Endereço</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {condominios?.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.nome}</TableCell>
                                    <TableCell>{(c as any).sindico_name || "Desconhecido"}</TableCell>
                                    <TableCell className="text-xs">{c.endereco}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminDashboard;
