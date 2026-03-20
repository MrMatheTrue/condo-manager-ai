export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_ia_historico: {
        Row: {
          acoes_executadas: Json | null
          condominio_id: string | null
          created_at: string
          id: string
          mensagem_usuario: string
          resposta_ia: string
          user_id: string
        }
        Insert: {
          acoes_executadas?: Json | null
          condominio_id?: string | null
          created_at?: string
          id?: string
          mensagem_usuario: string
          resposta_ia: string
          user_id: string
        }
        Update: {
          acoes_executadas?: Json | null
          condominio_id?: string | null
          created_at?: string
          id?: string
          mensagem_usuario?: string
          resposta_ia?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_ia_historico_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      condominio_acessos: {
        Row: {
          colaborador_nome: string | null
          condominio_id: string
          created_at: string
          id: string
          modulos_permitidos: Json | null
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso"]
          status: string
          user_id: string
        }
        Insert: {
          colaborador_nome?: string | null
          condominio_id: string
          created_at?: string
          id?: string
          modulos_permitidos?: Json | null
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          status?: string
          user_id: string
        }
        Update: {
          colaborador_nome?: string | null
          condominio_id?: string
          created_at?: string
          id?: string
          modulos_permitidos?: Json | null
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominio_acessos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      condominios: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          foto_capa_url: string | null
          id: string
          nome: string
          numero_andares: number | null
          numero_unidades: number | null
          sindico_id: string
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          foto_capa_url?: string | null
          id?: string
          nome: string
          numero_andares?: number | null
          numero_unidades?: number | null
          sindico_id: string
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          foto_capa_url?: string | null
          id?: string
          nome?: string
          numero_andares?: number | null
          numero_unidades?: number | null
          sindico_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          arquivo_url: string | null
          condominio_id: string
          created_at: string
          descricao: string | null
          drive_url: string | null
          extensao: string | null
          fonte: string
          id: string
          nome: string
          tamanho_bytes: number | null
          tipo_documento: string | null
          uploaded_by: string | null
        }
        Insert: {
          arquivo_url?: string | null
          condominio_id: string
          created_at?: string
          descricao?: string | null
          drive_url?: string | null
          extensao?: string | null
          fonte?: string
          id?: string
          nome: string
          tamanho_bytes?: number | null
          tipo_documento?: string | null
          uploaded_by?: string | null
        }
        Update: {
          arquivo_url?: string | null
          condominio_id?: string
          created_at?: string
          descricao?: string | null
          drive_url?: string | null
          extensao?: string | null
          fonte?: string
          id?: string
          nome?: string
          tamanho_bytes?: number | null
          tipo_documento?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_checkin: {
        Row: {
          condominio_id: string
          created_at: string
          data_execucao: string
          executado_por: string
          fotos_urls: Json | null
          id: string
          observacao: string | null
          status: Database["public"]["Enums"]["status_execucao"]
          tarefa_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          data_execucao?: string
          executado_por: string
          fotos_urls?: Json | null
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_execucao"]
          tarefa_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          data_execucao?: string
          executado_por?: string
          fotos_urls?: Json | null
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_execucao"]
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_checkin_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_checkin_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas_checkin"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      obrigacoes: {
        Row: {
          condominio_id: string
          created_at: string
          criticidade: Database["public"]["Enums"]["criticidade"]
          data_proxima_realizacao: string | null
          data_ultima_realizacao: string | null
          descricao: string | null
          dias_alerta_antecipado: number
          id: string
          nome: string
          observacoes: string | null
          periodicidade_dias: number
          responsavel_nome: string | null
          status: Database["public"]["Enums"]["status_obrigacao"]
          updated_at: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          criticidade?: Database["public"]["Enums"]["criticidade"]
          data_proxima_realizacao?: string | null
          data_ultima_realizacao?: string | null
          descricao?: string | null
          dias_alerta_antecipado?: number
          id?: string
          nome: string
          observacoes?: string | null
          periodicidade_dias?: number
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["status_obrigacao"]
          updated_at?: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          criticidade?: Database["public"]["Enums"]["criticidade"]
          data_proxima_realizacao?: string | null
          data_ultima_realizacao?: string | null
          descricao?: string | null
          dias_alerta_antecipado?: number
          id?: string
          nome?: string
          observacoes?: string | null
          periodicidade_dias?: number
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["status_obrigacao"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obrigacoes_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tarefas_checkin: {
        Row: {
          condominio_id: string
          created_at: string
          criado_por: string
          descricao: string | null
          frequencia: Database["public"]["Enums"]["frequencia_tarefa"]
          frequencia_dias: number | null
          horario_previsto: string | null
          id: string
          status_ativo: boolean
          titulo: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          criado_por: string
          descricao?: string | null
          frequencia?: Database["public"]["Enums"]["frequencia_tarefa"]
          frequencia_dias?: number | null
          horario_previsto?: string | null
          id?: string
          status_ativo?: boolean
          titulo: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          criado_por?: string
          descricao?: string | null
          frequencia?: Database["public"]["Enums"]["frequencia_tarefa"]
          frequencia_dias?: number | null
          horario_previsto?: string | null
          id?: string
          status_ativo?: boolean
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_checkin_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "sindico" | "funcionario" | "zelador" | "admin" | "colaborador"
      criticidade: "baixa" | "media" | "alta" | "critica"
      frequencia_tarefa: "diaria" | "semanal" | "mensal" | "personalizada"
      nivel_acesso: "total" | "leitura" | "tarefas_only"
      perfil_operacional: "zelador" | "aux_manutencao" | "porteiro"
      status_execucao: "pendente" | "concluida" | "nao_realizada"
      status_obrigacao: "em_dia" | "atencao" | "vencida"
      tipo_notificacao:
        | "obrigacao_vencendo"
        | "tarefa_atrasada"
        | "documento_adicionado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["sindico", "funcionario", "zelador", "admin", "colaborador"],
      criticidade: ["baixa", "media", "alta", "critica"],
      frequencia_tarefa: ["diaria", "semanal", "mensal", "personalizada"],
      nivel_acesso: ["total", "leitura", "tarefas_only"],
      perfil_operacional: ["zelador", "aux_manutencao", "porteiro"],
      status_execucao: ["pendente", "concluida", "nao_realizada"],
      status_obrigacao: ["em_dia", "atencao", "vencida"],
      tipo_notificacao: [
        "obrigacao_vencendo",
        "tarefa_atrasada",
        "documento_adicionado",
      ],
    },
  },
} as const
