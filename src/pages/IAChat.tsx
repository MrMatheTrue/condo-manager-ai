import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryGroq, getAISystemPrompt, ChatMessage } from "@/lib/groq";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, User, Loader2, ArrowLeft, History, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from 'react-markdown';

const IAChat = () => {
  const { condominioId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedCondoId, setSelectedCondoId] = useState<string | undefined>(condominioId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync selectedCondoId when URL param changes
  useEffect(() => {
    if (condominioId) setSelectedCondoId(condominioId);
  }, [condominioId]);

  // Load user's condominios so they can select one if no ID in URL
  const { data: condos } = useQuery({
    queryKey: ["condominios-ia", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, nome")
        .eq("sindico_id", user!.id)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Auto-select first condo if none selected
  useEffect(() => {
    if (!selectedCondoId && condos && condos.length > 0) {
      setSelectedCondoId(condos[0].id);
    }
  }, [condos, selectedCondoId]);

  const { data: condo } = useQuery({
    queryKey: ["condominio-ia", selectedCondoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("nome")
        .eq("id", selectedCondoId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCondoId,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!selectedCondoId) {
      toast({ variant: "destructive", title: "Selecione um condomínio", description: "Escolha o condomínio para conversar com a IA." });
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: input };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = await getAISystemPrompt(selectedCondoId);
      let currentMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...history
      ];

      let aiResponse = await queryGroq(currentMessages);

      if (aiResponse.tool_calls) {
        const updatedMessages = [...history, aiResponse];
        setMessages(updatedMessages);

        for (const toolCall of aiResponse.tool_calls) {
          const { name, arguments: argsString } = toolCall.function;
          const args = JSON.parse(argsString);
          let result: any = null;

          if (name === "get_all_data") {
            const { data: condosList } = await supabase.from("condominios").select("id, nome");
            const { data: obrs } = await supabase.from("obrigacoes").select("nome, status, condominio_id").eq("condominio_id", selectedCondoId);
            result = { condominios: condosList, obrigacoes: obrs };
          } else if (name === "add_obrigacao") {
            const { error } = await supabase.from("obrigacoes").insert({
              condominio_id: args.condominio_id || selectedCondoId,
              nome: args.nome,
              periodicidade_dias: args.periodicidade_dias || 365,
              criticidade: args.criticidade || "media",
            });
            result = error ? { error: error.message } : { success: true };
            if (!error) queryClient.invalidateQueries({ queryKey: ["obrigacoes", selectedCondoId] });
          } else if (name === "add_condominio") {
            const { error } = await supabase.from("condominios").insert({
              nome: args.nome,
              endereco: args.endereco,
              sindico_id: (await supabase.auth.getUser()).data.user?.id
            });
            result = error ? { error: error.message } : { success: true };
            if (!error) queryClient.invalidateQueries({ queryKey: ["condominios"] });
          } else if (name === "get_obrigacoes_status") {
            let q = supabase.from("obrigacoes").select("nome, status, criticidade, data_proxima_realizacao").eq("condominio_id", selectedCondoId);
            if (args.status) q = q.eq("status", args.status);
            const { data: obrs } = await q;
            result = { obrigacoes: obrs };
          }

          const toolMessage: ChatMessage = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          };

          currentMessages = [...currentMessages, aiResponse, toolMessage];
          const finalResponse = await queryGroq(currentMessages);
          setMessages((prev) => [...prev, toolMessage, finalResponse]);
        }
      } else {
        setMessages((prev) => [...prev, aiResponse]);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na IA",
        description: error.message || "Falha na comunicação."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" /> Assistente IA
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {condo ? <>Condomínio: <strong>{condo.nome}</strong></> : "Selecione um condomínio abaixo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Condo selector — shown when no condominioId in URL or multiple condos available */}
          {(!condominioId || (condos && condos.length > 1)) && condos && condos.length > 0 && (
            <Select value={selectedCondoId} onValueChange={setSelectedCondoId}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Selecionar condomínio" />
              </SelectTrigger>
              <SelectContent>
                {condos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setMessages([])} className="hidden md:flex">
            <History className="mr-2 h-4 w-4" /> Limpar Chat
          </Button>
        </div>
      </div>

      {/* No condo selected or no condos exist */}
      {!selectedCondoId && (
        <Card className="flex-1 flex items-center justify-center border-dashed">
          <div className="text-center space-y-3 p-8">
            <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="font-bold text-muted-foreground">Nenhum condomínio selecionado</p>
            <p className="text-sm text-muted-foreground">
              {condos?.length === 0
                ? "Cadastre um condomínio primeiro no Dashboard."
                : "Selecione um condomínio no menu acima para começar."}
            </p>
          </div>
        </Card>
      )}

      {selectedCondoId && (
        <Card className="flex-1 flex flex-col border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

          <ScrollArea className="flex-1 p-4 md:p-6 h-full">
            <div className="space-y-6 max-w-4xl mx-auto pb-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-6 bg-primary/10 rounded-full">
                    <Bot className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Inicie um comando operacional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg mt-4 px-4">
                    <Button variant="outline" className="justify-start text-xs font-medium h-auto py-3 px-4" onClick={() => setInput("Agende uma dedetização anual para o condomínio.")}>
                      "Agende uma dedetização anual."
                    </Button>
                    <Button variant="outline" className="justify-start text-xs font-medium h-auto py-3 px-4" onClick={() => setInput("Resuma minhas obrigações críticas.")}>
                      "Resuma minhas obrigações críticas."
                    </Button>
                  </div>
                </div>
              )}

              {messages.filter(m => m.role !== 'system' && m.role !== 'tool').map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
                      {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                        {m.content || "*(Executando ferramenta operacional...)*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start animate-pulse">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-dashed text-xs text-muted-foreground italic">
                      SINDIPRO está processando sua solicitação...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardContent className="p-4 border-t bg-background/50 backdrop-blur-sm">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2 max-w-4xl mx-auto"
            >
              <Input
                placeholder="Comando de voz ou texto..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="h-12 bg-muted/30 border-none shadow-inner focus-visible:ring-primary"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-12 w-12 rounded-xl"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IAChat;
