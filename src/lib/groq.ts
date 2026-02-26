import { supabase } from "@/integrations/supabase/client";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// ✅ FIX: "openai/gpt-oss-120b" não existe no Groq → causa loop eterno.
// Detectamos modelos inválidos e forçamos fallback para um modelo válido.
const MODELOS_INVALIDOS = ["openai/", "gpt-4", "gpt-3.5"];
const RAW_MODEL = import.meta.env.VITE_GROQ_MODEL || "";
export const GROQ_MODEL = MODELOS_INVALIDOS.some(m => RAW_MODEL.startsWith(m))
    ? "llama-3.3-70b-versatile"
    : (RAW_MODEL || "llama-3.3-70b-versatile");

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
            description: "Retorna todos os condomínios e suas obrigações para resumo.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "add_obrigacao",
            description: "Cria uma nova obrigação para um condomínio.",
            parameters: {
                type: "object",
                properties: {
                    condominio_id: { type: "string" },
                    nome: { type: "string" },
                    periodicidade_dias: { type: "number" },
                    criticidade: { type: "string", enum: ["baixa", "media", "alta", "critica"] }
                },
                required: ["condominio_id", "nome"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_condominio",
            description: "Cadastra um novo condomínio.",
            parameters: {
                type: "object",
                properties: {
                    nome: { type: "string" },
                    endereco: { type: "string" }
                },
                required: ["nome"]
            }
        }
    }
];

export const queryGroq = async (messages: ChatMessage[]) => {
    if (!GROQ_API_KEY) {
        throw new Error("VITE_GROQ_API_KEY is not defined");
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
            tools: tools,
            tool_choice: "auto",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to query Groq");
    }

    const data = await response.json();
    return data.choices[0].message;
};

/**
 * System Context Generator
 * Enriches the AI with real-time data about the current condominium
 */
export const getAISystemPrompt = async (condoId: string) => {
    const { data: condo } = await supabase.from("condominios").select("*").eq("id", condoId).single();
    const { data: obrigacoes } = await supabase.from("obrigacoes").select("*").eq("condominio_id", condoId);
    const { data: tarefas } = await supabase.from("tarefas_checkin").select("*").eq("condominio_id", condoId);

    const context = `
    VOCÊ É O ASSISTENTE SINDIPRO.
    Atuando no condomínio: ${condo?.nome || 'Não identificado'}.
    ID do Condomínio: ${condoId}.

    STATUS ATUAL:
    - Obrigações: ${obrigacoes?.length || 0} cadastradas.
    - Tarefas Operacionais: ${tarefas?.length || 0} no roteiro.
    - Vencimentos: ${obrigacoes?.filter(o => o.status === 'vencida').map(o => o.nome).join(', ') || 'Nenhum crítico'}.

    VOCÊ PODE:
    1. Agendar novas obrigações usando a ferramenta 'add_obrigacao'.
    2. Consultar o panorama geral.
    3. Auxiliar em dúvidas de gestão.

    Dê respostas curtas e objetivas em Português (BR). Use Markdown.
    `;

    return context;
};
