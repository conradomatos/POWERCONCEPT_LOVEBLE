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
      alocacoes_blocos: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          id: string
          observacao: string | null
          prioridade: number | null
          projeto_id: string
          tipo: Database["public"]["Enums"]["alocacao_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          observacao?: string | null
          prioridade?: number | null
          projeto_id: string
          tipo?: Database["public"]["Enums"]["alocacao_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          observacao?: string | null
          prioridade?: number | null
          projeto_id?: string
          tipo?: Database["public"]["Enums"]["alocacao_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_blocos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_blocos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      alocacoes_padrao: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          observacao: string | null
          projeto_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          observacao?: string | null
          projeto_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          observacao?: string | null
          projeto_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alocacoes_padrao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacoes_padrao_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamentos_consolidado: {
        Row: {
          arquivo_importacao_id: string | null
          centro_custo: string | null
          cpf: string
          created_at: string
          data_apontamento: string
          data_atualizacao_gantt: string | null
          data_importacao: string | null
          descricao: string | null
          funcionario_id: string | null
          gantt_atualizado: boolean
          horas: number
          id: string
          linha_arquivo: number | null
          motivo_erro: string | null
          nome_funcionario: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["apontamento_origem"]
          os_numero: string | null
          projeto_id: string | null
          projeto_nome: string | null
          status_apontamento: Database["public"]["Enums"]["apontamento_status"]
          status_integracao: Database["public"]["Enums"]["integracao_status"]
          tarefa_id: string | null
          tarefa_nome: string | null
          tipo_hora: Database["public"]["Enums"]["tipo_hora"]
          updated_at: string
          usuario_lancamento: string | null
        }
        Insert: {
          arquivo_importacao_id?: string | null
          centro_custo?: string | null
          cpf: string
          created_at?: string
          data_apontamento: string
          data_atualizacao_gantt?: string | null
          data_importacao?: string | null
          descricao?: string | null
          funcionario_id?: string | null
          gantt_atualizado?: boolean
          horas?: number
          id?: string
          linha_arquivo?: number | null
          motivo_erro?: string | null
          nome_funcionario?: string | null
          observacao?: string | null
          origem: Database["public"]["Enums"]["apontamento_origem"]
          os_numero?: string | null
          projeto_id?: string | null
          projeto_nome?: string | null
          status_apontamento?: Database["public"]["Enums"]["apontamento_status"]
          status_integracao?: Database["public"]["Enums"]["integracao_status"]
          tarefa_id?: string | null
          tarefa_nome?: string | null
          tipo_hora?: Database["public"]["Enums"]["tipo_hora"]
          updated_at?: string
          usuario_lancamento?: string | null
        }
        Update: {
          arquivo_importacao_id?: string | null
          centro_custo?: string | null
          cpf?: string
          created_at?: string
          data_apontamento?: string
          data_atualizacao_gantt?: string | null
          data_importacao?: string | null
          descricao?: string | null
          funcionario_id?: string | null
          gantt_atualizado?: boolean
          horas?: number
          id?: string
          linha_arquivo?: number | null
          motivo_erro?: string | null
          nome_funcionario?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["apontamento_origem"]
          os_numero?: string | null
          projeto_id?: string | null
          projeto_nome?: string | null
          status_apontamento?: Database["public"]["Enums"]["apontamento_status"]
          status_integracao?: Database["public"]["Enums"]["integracao_status"]
          tarefa_id?: string | null
          tarefa_nome?: string | null
          tipo_hora?: Database["public"]["Enums"]["tipo_hora"]
          updated_at?: string
          usuario_lancamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_consolidado_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_consolidado_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamentos_horas_dia: {
        Row: {
          colaborador_id: string
          cpf: string
          created_at: string
          data: string
          falta_horas: number
          fonte: string
          horas_100: number
          horas_50: number
          horas_normais: number
          horas_noturnas: number
          id: string
          os: string
          projeto_id: string
          updated_at: string
          warning_sem_custo: boolean
        }
        Insert: {
          colaborador_id: string
          cpf: string
          created_at?: string
          data: string
          falta_horas?: number
          fonte?: string
          horas_100?: number
          horas_50?: number
          horas_normais?: number
          horas_noturnas?: number
          id?: string
          os: string
          projeto_id: string
          updated_at?: string
          warning_sem_custo?: boolean
        }
        Update: {
          colaborador_id?: string
          cpf?: string
          created_at?: string
          data?: string
          falta_horas?: number
          fonte?: string
          horas_100?: number
          horas_50?: number
          horas_normais?: number
          horas_noturnas?: number
          id?: string
          os?: string
          projeto_id?: string
          updated_at?: string
          warning_sem_custo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_horas_dia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_horas_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos_importacao: {
        Row: {
          created_at: string
          id: string
          linhas_erro: number
          linhas_sucesso: number
          nome_arquivo: string
          tipo_arquivo: string
          total_linhas: number
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          linhas_erro?: number
          linhas_sucesso?: number
          nome_arquivo: string
          tipo_arquivo: string
          total_linhas?: number
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          linhas_erro?: number
          linhas_sucesso?: number
          nome_arquivo?: string
          tipo_arquivo?: string
          total_linhas?: number
          usuario_id?: string | null
        }
        Relationships: []
      }
      collaborator_history: {
        Row: {
          changed_at: string
          changed_by: string
          changes: Json
          collaborator_id: string
          id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changes: Json
          collaborator_id: string
          id?: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changes?: Json
          collaborator_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_history_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          birth_date: string | null
          cpf: string
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          full_name: string
          hire_date: string
          id: string
          phone: string | null
          position: string | null
          status: Database["public"]["Enums"]["employee_status"]
          termination_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          birth_date?: string | null
          cpf: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          hire_date: string
          id?: string
          phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          birth_date?: string | null
          cpf?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string
          id?: string
          phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      custo_projeto_dia: {
        Row: {
          colaborador_id: string
          cpf: string
          created_at: string
          custo_100: number | null
          custo_50: number | null
          custo_hora: number | null
          custo_normal: number | null
          custo_noturno: number | null
          custo_total: number | null
          data: string
          falta_horas: number
          horas_100: number
          horas_50: number
          horas_normais: number
          horas_noturnas: number
          id: string
          observacao: string | null
          projeto_id: string
          status: Database["public"]["Enums"]["custo_status"]
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          cpf: string
          created_at?: string
          custo_100?: number | null
          custo_50?: number | null
          custo_hora?: number | null
          custo_normal?: number | null
          custo_noturno?: number | null
          custo_total?: number | null
          data: string
          falta_horas?: number
          horas_100?: number
          horas_50?: number
          horas_normais?: number
          horas_noturnas?: number
          id?: string
          observacao?: string | null
          projeto_id: string
          status: Database["public"]["Enums"]["custo_status"]
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          cpf?: string
          created_at?: string
          custo_100?: number | null
          custo_50?: number | null
          custo_hora?: number | null
          custo_normal?: number | null
          custo_noturno?: number | null
          custo_total?: number | null
          data?: string
          falta_horas?: number
          horas_100?: number
          horas_50?: number
          horas_normais?: number
          horas_noturnas?: number
          id?: string
          observacao?: string | null
          projeto_id?: string
          status?: Database["public"]["Enums"]["custo_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custo_projeto_dia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_projeto_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_colaborador: {
        Row: {
          beneficios: number
          classificacao: string
          colaborador_id: string
          created_at: string
          created_by: string | null
          fim_vigencia: string | null
          id: string
          inicio_vigencia: string
          motivo_alteracao: string
          observacao: string
          periculosidade: boolean
          salario_base: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          beneficios?: number
          classificacao?: string
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia: string
          motivo_alteracao?: string
          observacao?: string
          periculosidade?: boolean
          salario_base: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          beneficios?: number
          classificacao?: string
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia?: string
          motivo_alteracao?: string
          observacao?: string
          periculosidade?: boolean
          salario_base?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custos_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          codigo: string
          created_at: string
          created_by: string | null
          empresa: string
          id: string
          razao_social: string
          segmento: string
          status: Database["public"]["Enums"]["empresa_status"]
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cnpj?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          empresa: string
          id?: string
          razao_social: string
          segmento: string
          status?: Database["public"]["Enums"]["empresa_status"]
          unidade: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cnpj?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          empresa?: string
          id?: string
          razao_social?: string
          segmento?: string
          status?: Database["public"]["Enums"]["empresa_status"]
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          os: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          os: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          os?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      generate_next_os: { Args: never; Returns: string }
      get_alocacao_por_data: {
        Args: {
          p_colaborador_id: string
          p_data: string
          p_tipo?: Database["public"]["Enums"]["alocacao_tipo"]
        }
        Returns: {
          id: string
          projeto_codigo: string
          projeto_id: string
          projeto_nome: string
        }[]
      }
      get_custo_vigente: {
        Args: { p_colaborador_id: string; p_data_referencia?: string }
        Returns: {
          adicional_periculosidade: number
          beneficios: number
          classificacao: string
          colaborador_id: string
          custo_hora: number
          custo_mensal_total: number
          fim_vigencia: string
          id: string
          inicio_vigencia: string
          motivo_alteracao: string
          observacao: string
          periculosidade: boolean
          salario_base: number
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alocacao_tipo: "planejado" | "realizado"
      apontamento_origem: "IMPORTACAO" | "MANUAL" | "SISTEMA"
      apontamento_status:
        | "PENDENTE"
        | "LANCADO"
        | "APROVADO"
        | "REPROVADO"
        | "NAO_LANCADO"
      app_role: "admin" | "rh" | "financeiro" | "super_admin"
      custo_status: "OK" | "SEM_CUSTO"
      employee_status: "ativo" | "afastado" | "desligado"
      empresa_status: "ativo" | "inativo"
      integracao_status: "OK" | "ERRO" | "PENDENTE"
      tipo_hora: "NORMAL" | "H50" | "H100" | "NOTURNA"
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
      alocacao_tipo: ["planejado", "realizado"],
      apontamento_origem: ["IMPORTACAO", "MANUAL", "SISTEMA"],
      apontamento_status: [
        "PENDENTE",
        "LANCADO",
        "APROVADO",
        "REPROVADO",
        "NAO_LANCADO",
      ],
      app_role: ["admin", "rh", "financeiro", "super_admin"],
      custo_status: ["OK", "SEM_CUSTO"],
      employee_status: ["ativo", "afastado", "desligado"],
      empresa_status: ["ativo", "inativo"],
      integracao_status: ["OK", "ERRO", "PENDENTE"],
      tipo_hora: ["NORMAL", "H50", "H100", "NOTURNA"],
    },
  },
} as const
