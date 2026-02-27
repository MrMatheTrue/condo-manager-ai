import { supabase } from "@/integrations/supabase/client";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || "llama-3.3-70b-versatile";

export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content?: string;
    tool_calls?: any[];
    tool_call_id?: string;
}

export const tools = [
    {
        type: "function",
        function: {
            name: "get_all_data",
            description: "Retorna todos os condomínios e suas obrigações para resumo geral.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "add_obrigacao",
            description: "Cria uma nova obrigação periódica para um condomínio.",
            parameters: {
                type: "object",
                properties: {
                    condominio_id: { type: "string", description: "UUID do condomínio" },
                    nome: { type: "string", description: "Nome da obrigação" },
                    periodicidade_dias: { type: "number", description: "Ex: 365=anual, 180=semestral, 90=trimestral, 30=mensal" },
                    criticidade: { type: "string", enum: ["baixa", "media", "alta", "critica"] },
                    descricao: { type: "string" }
                },
                required: ["condominio_id", "nome"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_condominio",
            description: "Cadastra um novo condomínio para o síndico.",
            parameters: {
                type: "object",
                properties: {
                    nome: { type: "string" },
                    endereco: { type: "string" },
                    cidade: { type: "string" },
                    estado: { type: "string" }
                },
                required: ["nome"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_obrigacoes_status",
            description: "Lista obrigações filtradas por status.",
            parameters: {
                type: "object",
                properties: {
                    condominio_id: { type: "string" },
                    status: { type: "string", enum: ["em_dia", "atencao", "vencida"] }
                },
                required: []
            }
        }
    }
];

export const queryGroq = async (messages: ChatMessage[]) => {
    if (!GROQ_API_KEY) {
        throw new Error("VITE_GROQ_API_KEY não configurada. Verifique as variáveis de ambiente.");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages,
            model: GROQ_MODEL,
            temperature: 0.1,
            max_tokens: 1024,
            tools,
            tool_choice: "auto",
        }),
    });

    if (!response.ok) {
        let errorMsg = `Groq API error: HTTP ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
        } catch { /* ignore */ }
        throw new Error(errorMsg);
    }

    const data = await response.json();

    if (!data.choices?.length) {
        throw new Error("Resposta inesperada da IA — nenhum resultado retornado.");
    }

    return data.choices[0].message;
};

export const getAISystemPrompt = async (condoId: string) => {
    const { data: condo } = await supabase.from("condominios").select("*").eq("id", condoId).single();
    const { data: obrigacoes } = await supabase.from("obrigacoes").select("*").eq("condominio_id", condoId);
    const { data: tarefas } = await supabase.from("tarefas_checkin").select("*").eq("condominio_id", condoId);

    const vencidas = obrigacoes?.filter(o => o.status === "vencida").map(o => o.nome).join(", ") || "Nenhuma";
    const emAtencao = obrigacoes?.filter(o => o.status === "atencao").map(o => o.nome).join(", ") || "Nenhuma";

    return `Você é o SINDIPRO AI — assistente especializado em gestão de condomínios.
Responda sempre em Português (BR), de forma objetiva e profissional. Use Markdown quando útil.

CONDOMÍNIO ATUAL: ${condo?.nome || "Não identificado"}
ID: ${condoId}

STATUS:
- Obrigações cadastradas: ${obrigacoes?.length || 0}
- Vencidas: ${vencidas}
- Em atenção: ${emAtencao}
- Tarefas operacionais: ${tarefas?.length || 0}

VOCÊ PODE:
1. Criar obrigações → use add_obrigacao
2. Consultar dados → use get_all_data ou get_obrigacoes_status
3. Criar condomínio → use add_condominio
4. Responder perguntas de gestão condominial

Seja breve, direto e confirme ações importantes antes de executar.`.trim();
};