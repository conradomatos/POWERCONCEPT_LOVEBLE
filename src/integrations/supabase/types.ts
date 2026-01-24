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
          {
            foreignKeyName: "alocacoes_blocos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "alocacoes_blocos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
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
          {
            foreignKeyName: "alocacoes_padrao_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "alocacoes_padrao_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
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
          {
            foreignKeyName: "apontamentos_consolidado_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "apontamentos_consolidado_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
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
          {
            foreignKeyName: "apontamentos_horas_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "apontamentos_horas_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
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
          resumo_json: Json | null
          tipo: string | null
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
          resumo_json?: Json | null
          tipo?: string | null
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
          resumo_json?: Json | null
          tipo?: string | null
          tipo_arquivo?: string
          total_linhas?: number
          usuario_id?: string | null
        }
        Relationships: []
      }
      budget_circuits: {
        Row: {
          corrente_in_a: number | null
          created_at: string
          fatores_json: Json | null
          id: string
          kw: number | null
          revision_id: string
          saida_json: Json | null
          tag: string
          tensao_v: number | null
          tipo_partida: string | null
          wbs_id: string | null
        }
        Insert: {
          corrente_in_a?: number | null
          created_at?: string
          fatores_json?: Json | null
          id?: string
          kw?: number | null
          revision_id: string
          saida_json?: Json | null
          tag: string
          tensao_v?: number | null
          tipo_partida?: string | null
          wbs_id?: string | null
        }
        Update: {
          corrente_in_a?: number | null
          created_at?: string
          fatores_json?: Json | null
          id?: string
          kw?: number | null
          revision_id?: string
          saida_json?: Json | null
          tag?: string
          tensao_v?: number | null
          tipo_partida?: string | null
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_circuits_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_circuits_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_documents: {
        Row: {
          created_at: string
          created_by: string
          id: string
          nome_arquivo: string
          revision_id: string
          storage_path: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          nome_arquivo: string
          revision_id: string
          storage_path: string
          tipo?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          nome_arquivo?: string
          revision_id?: string
          storage_path?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_documents_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_generated_materials: {
        Row: {
          circuit_id: string
          created_at: string
          descricao: string
          id: string
          material_codigo: string
          quantidade: number
          revision_id: string
          status: Database["public"]["Enums"]["gen_status"]
          unidade: string
        }
        Insert: {
          circuit_id: string
          created_at?: string
          descricao: string
          id?: string
          material_codigo: string
          quantidade?: number
          revision_id: string
          status?: Database["public"]["Enums"]["gen_status"]
          unidade: string
        }
        Update: {
          circuit_id?: string
          created_at?: string
          descricao?: string
          id?: string
          material_codigo?: string
          quantidade?: number
          revision_id?: string
          status?: Database["public"]["Enums"]["gen_status"]
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_generated_materials_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "budget_circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_generated_materials_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_histogram: {
        Row: {
          created_at: string
          custo_total: number
          hh_100: number
          hh_50: number
          hh_normais: number
          hh_total: number
          id: string
          labor_role_id: string
          mes_ref: string
          revision_id: string
        }
        Insert: {
          created_at?: string
          custo_total?: number
          hh_100?: number
          hh_50?: number
          hh_normais?: number
          hh_total?: number
          id?: string
          labor_role_id: string
          mes_ref: string
          revision_id: string
        }
        Update: {
          created_at?: string
          custo_total?: number
          hh_100?: number
          hh_50?: number
          hh_normais?: number
          hh_total?: number
          id?: string
          labor_role_id?: string
          mes_ref?: string
          revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_histogram_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_histogram_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_histogram_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_material_items: {
        Row: {
          catalog_id: string | null
          codigo: string | null
          descricao: string
          fator_dificuldade: number
          fornecimento: Database["public"]["Enums"]["supply_type"]
          hh_total: number
          hh_unitario: number
          id: string
          item_seq: number
          observacao: string | null
          preco_total: number
          preco_unit: number
          quantidade: number
          revision_id: string
          unidade: string
          wbs_id: string | null
        }
        Insert: {
          catalog_id?: string | null
          codigo?: string | null
          descricao: string
          fator_dificuldade?: number
          fornecimento?: Database["public"]["Enums"]["supply_type"]
          hh_total?: number
          hh_unitario?: number
          id?: string
          item_seq: number
          observacao?: string | null
          preco_total?: number
          preco_unit?: number
          quantidade?: number
          revision_id: string
          unidade: string
          wbs_id?: string | null
        }
        Update: {
          catalog_id?: string | null
          codigo?: string | null
          descricao?: string
          fator_dificuldade?: number
          fornecimento?: Database["public"]["Enums"]["supply_type"]
          hh_total?: number
          hh_unitario?: number
          id?: string
          item_seq?: number
          observacao?: string | null
          preco_total?: number
          preco_unit?: number
          quantidade?: number
          revision_id?: string
          unidade?: string
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_material_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_material_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_material_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_revisions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget_id: string
          condicoes_pagamento: string | null
          created_at: string
          created_by: string
          exclusoes: string | null
          id: string
          observacoes: string | null
          prazo_execucao_meses: number | null
          premissas: string | null
          projeto_id: string | null
          revision_number: number
          sent_at: string | null
          status: Database["public"]["Enums"]["revision_status"]
          validade_proposta: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget_id: string
          condicoes_pagamento?: string | null
          created_at?: string
          created_by: string
          exclusoes?: string | null
          id?: string
          observacoes?: string | null
          prazo_execucao_meses?: number | null
          premissas?: string | null
          projeto_id?: string | null
          revision_number?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["revision_status"]
          validade_proposta?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget_id?: string
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string
          exclusoes?: string | null
          id?: string
          observacoes?: string | null
          prazo_execucao_meses?: number | null
          premissas?: string | null
          projeto_id?: string | null
          revision_number?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["revision_status"]
          validade_proposta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_revisions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_revisions_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_revisions_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "budget_revisions_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      budget_summary: {
        Row: {
          id: string
          margem_pct: number
          margem_rs: number
          markup_pct_aplicado: number
          preco_venda: number
          revision_id: string
          subtotal_custo: number
          total_canteiro: number
          total_engenharia: number
          total_equipamentos: number
          total_hh_materiais: number
          total_impostos: number
          total_materiais: number
          total_mo: number
          total_mobilizacao: number
          updated_at: string
          valor_markup: number
        }
        Insert: {
          id?: string
          margem_pct?: number
          margem_rs?: number
          markup_pct_aplicado?: number
          preco_venda?: number
          revision_id: string
          subtotal_custo?: number
          total_canteiro?: number
          total_engenharia?: number
          total_equipamentos?: number
          total_hh_materiais?: number
          total_impostos?: number
          total_materiais?: number
          total_mo?: number
          total_mobilizacao?: number
          updated_at?: string
          valor_markup?: number
        }
        Update: {
          id?: string
          margem_pct?: number
          margem_rs?: number
          markup_pct_aplicado?: number
          preco_venda?: number
          revision_id?: string
          subtotal_custo?: number
          total_canteiro?: number
          total_engenharia?: number
          total_equipamentos?: number
          total_hh_materiais?: number
          total_impostos?: number
          total_materiais?: number
          total_mo?: number
          total_mobilizacao?: number
          updated_at?: string
          valor_markup?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_summary_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_taxes: {
        Row: {
          aliquota: number
          ativo: boolean
          created_at: string
          id: string
          revision_id: string
          tax_catalog_id: string
        }
        Insert: {
          aliquota?: number
          ativo?: boolean
          created_at?: string
          id?: string
          revision_id: string
          tax_catalog_id: string
        }
        Update: {
          aliquota?: number
          ativo?: boolean
          created_at?: string
          id?: string
          revision_id?: string
          tax_catalog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_taxes_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_taxes_tax_catalog_id_fkey"
            columns: ["tax_catalog_id"]
            isOneToOne: false
            referencedRelation: "tax_rules_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_wbs: {
        Row: {
          code: string
          id: string
          nome: string
          ordem: number
          parent_id: string | null
          revision_id: string
          tipo: Database["public"]["Enums"]["wbs_type"]
        }
        Insert: {
          code: string
          id?: string
          nome: string
          ordem?: number
          parent_id?: string | null
          revision_id: string
          tipo?: Database["public"]["Enums"]["wbs_type"]
        }
        Update: {
          code?: string
          id?: string
          nome?: string
          ordem?: number
          parent_id?: string | null
          revision_id?: string
          tipo?: Database["public"]["Enums"]["wbs_type"]
        }
        Relationships: [
          {
            foreignKeyName: "budget_wbs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_wbs_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_number: string
          cliente_id: string
          created_at: string
          id: string
          local: string | null
          obra_nome: string
          responsavel_user_id: string
          updated_at: string
        }
        Insert: {
          budget_number: string
          cliente_id: string
          created_at?: string
          id?: string
          local?: string | null
          obra_nome: string
          responsavel_user_id: string
          updated_at?: string
        }
        Update: {
          budget_number?: string
          cliente_id?: string
          created_at?: string
          id?: string
          local?: string | null
          obra_nome?: string
          responsavel_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_schedule: {
        Row: {
          categoria: string
          created_at: string
          id: string
          mes_ref: string
          revision_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          mes_ref: string
          revision_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          mes_ref?: string
          revision_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_schedule_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
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
          equipe: string | null
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
          equipe?: string | null
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
          equipe?: string | null
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
          {
            foreignKeyName: "custo_projeto_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "custo_projeto_dia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
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
      custos_diretos_projeto: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descricao: string
          documento: string | null
          fornecedor: string | null
          id: string
          observacao: string | null
          projeto_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          descricao: string
          documento?: string | null
          fornecedor?: string | null
          id?: string
          observacao?: string | null
          projeto_id: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string
          documento?: string | null
          fornecedor?: string | null
          id?: string
          observacao?: string | null
          projeto_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_diretos_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_diretos_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "custos_diretos_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
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
      encargos_modelo_clt: {
        Row: {
          created_at: string
          created_by: string | null
          fator_rescisao_fgts: number
          fgts: number
          fgts_a: number
          id: string
          inss: number
          inss_a: number
          provisao_13: number
          provisao_ferias: number
          ratsat: number
          salario_educacao: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fator_rescisao_fgts: number
          fgts: number
          fgts_a: number
          id?: string
          inss: number
          inss_a: number
          provisao_13: number
          provisao_ferias: number
          ratsat: number
          salario_educacao: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fator_rescisao_fgts?: number
          fgts?: number
          fgts_a?: number
          id?: string
          inss?: number
          inss_a?: number
          provisao_13?: number
          provisao_ferias?: number
          ratsat?: number
          salario_educacao?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      engineering_catalog: {
        Row: {
          created_at: string
          descricao: string
          hh_ref: number | null
          id: string
          tipo: Database["public"]["Enums"]["eng_type"]
          valor_ref: number | null
        }
        Insert: {
          created_at?: string
          descricao: string
          hh_ref?: number | null
          id?: string
          tipo?: Database["public"]["Enums"]["eng_type"]
          valor_ref?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string
          hh_ref?: number | null
          id?: string
          tipo?: Database["public"]["Enums"]["eng_type"]
          valor_ref?: number | null
        }
        Relationships: []
      }
      engineering_items: {
        Row: {
          catalog_id: string | null
          created_at: string
          descricao: string
          hh: number | null
          id: string
          labor_role_id: string | null
          revision_id: string
          tipo: Database["public"]["Enums"]["eng_type"]
          total: number
          valor: number | null
          wbs_id: string | null
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          descricao: string
          hh?: number | null
          id?: string
          labor_role_id?: string | null
          revision_id: string
          tipo?: Database["public"]["Enums"]["eng_type"]
          total?: number
          valor?: number | null
          wbs_id?: string | null
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          descricao?: string
          hh?: number | null
          id?: string
          labor_role_id?: string | null
          revision_id?: string
          tipo?: Database["public"]["Enums"]["eng_type"]
          total?: number
          valor?: number | null
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engineering_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "engineering_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_items_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_items_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rentals: {
        Row: {
          catalog_id: string | null
          created_at: string
          descricao: string
          id: string
          meses: number
          quantidade: number
          revision_id: string
          total: number
          valor_mensal: number
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          meses?: number
          quantidade?: number
          revision_id: string
          total?: number
          valor_mensal?: number
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          meses?: number
          quantidade?: number
          revision_id?: string
          total?: number
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rentals_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_rentals_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_rentals_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rentals_catalog: {
        Row: {
          created_at: string
          descricao: string
          id: string
          valor_mensal_ref: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          valor_mensal_ref?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          valor_mensal_ref?: number
        }
        Relationships: []
      }
      labor_cost_snapshot: {
        Row: {
          custo_hora_he100: number
          custo_hora_he50: number
          custo_hora_normal: number
          id: string
          labor_role_id: string
          memoria_json: Json | null
          revision_id: string
          updated_at: string
        }
        Insert: {
          custo_hora_he100?: number
          custo_hora_he50?: number
          custo_hora_normal?: number
          id?: string
          labor_role_id: string
          memoria_json?: Json | null
          revision_id: string
          updated_at?: string
        }
        Update: {
          custo_hora_he100?: number
          custo_hora_he50?: number
          custo_hora_normal?: number
          id?: string
          labor_role_id?: string
          memoria_json?: Json | null
          revision_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_cost_snapshot_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_cost_snapshot_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_cost_snapshot_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_hh_allocations: {
        Row: {
          created_at: string
          custo_total: number
          descricao: string
          hh_100: number
          hh_50: number
          hh_normais: number
          hh_total: number
          id: string
          labor_role_id: string
          origem: Database["public"]["Enums"]["hh_origin"]
          revision_id: string
          wbs_id: string | null
        }
        Insert: {
          created_at?: string
          custo_total?: number
          descricao: string
          hh_100?: number
          hh_50?: number
          hh_normais?: number
          hh_total?: number
          id?: string
          labor_role_id: string
          origem?: Database["public"]["Enums"]["hh_origin"]
          revision_id: string
          wbs_id?: string | null
        }
        Update: {
          created_at?: string
          custo_total?: number
          descricao?: string
          hh_100?: number
          hh_50?: number
          hh_normais?: number
          hh_total?: number
          id?: string
          labor_role_id?: string
          origem?: Database["public"]["Enums"]["hh_origin"]
          revision_id?: string
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_hh_allocations_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_hh_allocations_labor_role_id_fkey"
            columns: ["labor_role_id"]
            isOneToOne: false
            referencedRelation: "vw_budget_labor_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_hh_allocations_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_hh_allocations_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_param_catalog: {
        Row: {
          adicional_noturno_pct_ref: number
          created_at: string
          custos_pessoa_json_ref: Json | null
          encargos_pct_ref: number
          he100_pct_ref: number
          he50_pct_ref: number
          id: string
          improdutividade_pct_ref: number
          incidencias_json_ref: Json | null
          insalubridade_pct_ref: number
          nome: string
          periculosidade_pct_ref: number
        }
        Insert: {
          adicional_noturno_pct_ref?: number
          created_at?: string
          custos_pessoa_json_ref?: Json | null
          encargos_pct_ref?: number
          he100_pct_ref?: number
          he50_pct_ref?: number
          id?: string
          improdutividade_pct_ref?: number
          incidencias_json_ref?: Json | null
          insalubridade_pct_ref?: number
          nome: string
          periculosidade_pct_ref?: number
        }
        Update: {
          adicional_noturno_pct_ref?: number
          created_at?: string
          custos_pessoa_json_ref?: Json | null
          encargos_pct_ref?: number
          he100_pct_ref?: number
          he50_pct_ref?: number
          id?: string
          improdutividade_pct_ref?: number
          incidencias_json_ref?: Json | null
          insalubridade_pct_ref?: number
          nome?: string
          periculosidade_pct_ref?: number
        }
        Relationships: []
      }
      labor_parameters: {
        Row: {
          adicional_noturno_pct: number
          created_at: string
          custos_pessoa_json: Json | null
          encargos_pct: number
          he100_pct: number
          he50_pct: number
          id: string
          improdutividade_pct: number
          incidencias_json: Json | null
          insalubridade_pct: number
          periculosidade_pct: number
          revision_id: string
          updated_at: string
        }
        Insert: {
          adicional_noturno_pct?: number
          created_at?: string
          custos_pessoa_json?: Json | null
          encargos_pct?: number
          he100_pct?: number
          he50_pct?: number
          id?: string
          improdutividade_pct?: number
          incidencias_json?: Json | null
          insalubridade_pct?: number
          periculosidade_pct?: number
          revision_id: string
          updated_at?: string
        }
        Update: {
          adicional_noturno_pct?: number
          created_at?: string
          custos_pessoa_json?: Json | null
          encargos_pct?: number
          he100_pct?: number
          he50_pct?: number
          id?: string
          improdutividade_pct?: number
          incidencias_json?: Json | null
          insalubridade_pct?: number
          periculosidade_pct?: number
          revision_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_parameters_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_role_catalog: {
        Row: {
          carga_horaria_ref: number
          created_at: string
          funcao: string
          id: string
          modalidade: Database["public"]["Enums"]["labor_modality"]
          salario_base_ref: number
        }
        Insert: {
          carga_horaria_ref?: number
          created_at?: string
          funcao: string
          id?: string
          modalidade?: Database["public"]["Enums"]["labor_modality"]
          salario_base_ref?: number
        }
        Update: {
          carga_horaria_ref?: number
          created_at?: string
          funcao?: string
          id?: string
          modalidade?: Database["public"]["Enums"]["labor_modality"]
          salario_base_ref?: number
        }
        Relationships: []
      }
      labor_roles: {
        Row: {
          ativo: boolean
          carga_horaria_mensal: number
          catalog_id: string | null
          created_at: string
          funcao: string
          id: string
          modalidade: Database["public"]["Enums"]["labor_modality"]
          revision_id: string
          salario_base: number
        }
        Insert: {
          ativo?: boolean
          carga_horaria_mensal?: number
          catalog_id?: string | null
          created_at?: string
          funcao: string
          id?: string
          modalidade?: Database["public"]["Enums"]["labor_modality"]
          revision_id: string
          salario_base?: number
        }
        Update: {
          ativo?: boolean
          carga_horaria_mensal?: number
          catalog_id?: string | null
          created_at?: string
          funcao?: string
          id?: string
          modalidade?: Database["public"]["Enums"]["labor_modality"]
          revision_id?: string
          salario_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "labor_roles_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "labor_role_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_roles_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      markup_rule_sets: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      markup_rules: {
        Row: {
          allow_per_wbs: boolean
          created_at: string
          id: string
          markup_pct: number
          revision_id: string
        }
        Insert: {
          allow_per_wbs?: boolean
          created_at?: string
          id?: string
          markup_pct?: number
          revision_id: string
        }
        Update: {
          allow_per_wbs?: boolean
          created_at?: string
          id?: string
          markup_pct?: number
          revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "markup_rules_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      markup_rules_catalog: {
        Row: {
          allow_per_wbs: boolean
          id: string
          markup_pct: number
          set_id: string
        }
        Insert: {
          allow_per_wbs?: boolean
          id?: string
          markup_pct?: number
          set_id: string
        }
        Update: {
          allow_per_wbs?: boolean
          id?: string
          markup_pct?: number
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "markup_rules_catalog_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "markup_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      material_catalog: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string
          created_at: string
          descricao: string
          hh_unit_ref: number | null
          id: string
          preco_ref: number | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo: string
          created_at?: string
          descricao: string
          hh_unit_ref?: number | null
          id?: string
          preco_ref?: number | null
          unidade: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string
          created_at?: string
          descricao?: string
          hh_unit_ref?: number | null
          id?: string
          preco_ref?: number | null
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_catalog_price_history: {
        Row: {
          catalog_id: string
          changed_at: string
          changed_by: string | null
          codigo: string
          id: string
          import_run_id: string | null
          new_price: number | null
          old_price: number | null
        }
        Insert: {
          catalog_id: string
          changed_at?: string
          changed_by?: string | null
          codigo: string
          id?: string
          import_run_id?: string | null
          new_price?: number | null
          old_price?: number | null
        }
        Update: {
          catalog_id?: string
          changed_at?: string
          changed_by?: string | null
          codigo?: string
          id?: string
          import_run_id?: string | null
          new_price?: number | null
          old_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_catalog_price_history_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_catalog_price_history_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "arquivos_importacao"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilization_catalog: {
        Row: {
          created_at: string
          descricao: string
          id: string
          unidade: string | null
          valor_unitario_ref: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          unidade?: string | null
          valor_unitario_ref?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          unidade?: string | null
          valor_unitario_ref?: number
        }
        Relationships: []
      }
      mobilization_items: {
        Row: {
          created_at: string
          descricao: string
          id: string
          quantidade: number
          revision_id: string
          total: number
          unidade: string | null
          valor_unitario: number
          wbs_id: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          quantidade?: number
          revision_id: string
          total?: number
          unidade?: string | null
          valor_unitario?: number
          wbs_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          quantidade?: number
          revision_id?: string
          total?: number
          unidade?: string | null
          valor_unitario?: number
          wbs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobilization_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      omie_contas_pagar: {
        Row: {
          categoria: string | null
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          descricao: string | null
          fornecedor: string | null
          fornecedor_cnpj: string | null
          id: string
          id_omie_titulo: number
          numero_documento: string | null
          observacoes: string | null
          omie_projeto_codigo: number | null
          parcela: string | null
          projeto_id: string | null
          status: Database["public"]["Enums"]["titulo_status"]
          sync_id: string | null
          updated_at: string
          valor: number
          valor_pago: number
          vencimento: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_emissao: string
          data_pagamento?: string | null
          descricao?: string | null
          fornecedor?: string | null
          fornecedor_cnpj?: string | null
          id?: string
          id_omie_titulo: number
          numero_documento?: string | null
          observacoes?: string | null
          omie_projeto_codigo?: number | null
          parcela?: string | null
          projeto_id?: string | null
          status?: Database["public"]["Enums"]["titulo_status"]
          sync_id?: string | null
          updated_at?: string
          valor?: number
          valor_pago?: number
          vencimento: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          descricao?: string | null
          fornecedor?: string | null
          fornecedor_cnpj?: string | null
          id?: string
          id_omie_titulo?: number
          numero_documento?: string | null
          observacoes?: string | null
          omie_projeto_codigo?: number | null
          parcela?: string | null
          projeto_id?: string | null
          status?: Database["public"]["Enums"]["titulo_status"]
          sync_id?: string | null
          updated_at?: string
          valor?: number
          valor_pago?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "omie_contas_pagar_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omie_contas_pagar_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "omie_contas_pagar_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      omie_contas_receber: {
        Row: {
          categoria: string | null
          cliente: string | null
          cliente_cnpj: string | null
          created_at: string
          data_emissao: string
          data_recebimento: string | null
          descricao: string | null
          id: string
          id_omie_titulo: number
          numero_documento: string | null
          observacoes: string | null
          omie_projeto_codigo: number | null
          parcela: string | null
          projeto_id: string | null
          status: Database["public"]["Enums"]["titulo_status"]
          sync_id: string | null
          updated_at: string
          valor: number
          valor_recebido: number
          vencimento: string
        }
        Insert: {
          categoria?: string | null
          cliente?: string | null
          cliente_cnpj?: string | null
          created_at?: string
          data_emissao: string
          data_recebimento?: string | null
          descricao?: string | null
          id?: string
          id_omie_titulo: number
          numero_documento?: string | null
          observacoes?: string | null
          omie_projeto_codigo?: number | null
          parcela?: string | null
          projeto_id?: string | null
          status?: Database["public"]["Enums"]["titulo_status"]
          sync_id?: string | null
          updated_at?: string
          valor?: number
          valor_recebido?: number
          vencimento: string
        }
        Update: {
          categoria?: string | null
          cliente?: string | null
          cliente_cnpj?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string | null
          descricao?: string | null
          id?: string
          id_omie_titulo?: number
          numero_documento?: string | null
          observacoes?: string | null
          omie_projeto_codigo?: number | null
          parcela?: string | null
          projeto_id?: string | null
          status?: Database["public"]["Enums"]["titulo_status"]
          sync_id?: string | null
          updated_at?: string
          valor?: number
          valor_recebido?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "omie_contas_receber_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omie_contas_receber_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "omie_contas_receber_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      omie_projetos: {
        Row: {
          cod_int: string | null
          codigo: number
          created_at: string | null
          id: string
          inativo: boolean | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          cod_int?: string | null
          codigo: number
          created_at?: string | null
          id?: string
          inativo?: boolean | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          cod_int?: string | null
          codigo?: number
          created_at?: string | null
          id?: string
          inativo?: boolean | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      omie_sync_log: {
        Row: {
          detalhes: Json | null
          erro_mensagem: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          iniciado_por: string | null
          pendencias_criadas: number
          registros_atualizados: number
          registros_novos: number
          registros_processados: number
          status: Database["public"]["Enums"]["sync_status"]
          tipo: Database["public"]["Enums"]["sync_tipo"]
        }
        Insert: {
          detalhes?: Json | null
          erro_mensagem?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          pendencias_criadas?: number
          registros_atualizados?: number
          registros_novos?: number
          registros_processados?: number
          status?: Database["public"]["Enums"]["sync_status"]
          tipo: Database["public"]["Enums"]["sync_tipo"]
        }
        Update: {
          detalhes?: Json | null
          erro_mensagem?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          pendencias_criadas?: number
          registros_atualizados?: number
          registros_novos?: number
          registros_processados?: number
          status?: Database["public"]["Enums"]["sync_status"]
          tipo?: Database["public"]["Enums"]["sync_tipo"]
        }
        Relationships: []
      }
      pendencias_financeiras: {
        Row: {
          created_at: string
          detalhes: Json | null
          id: string
          origem: Database["public"]["Enums"]["pendencia_origem"]
          projeto_id: string | null
          referencia_id: string
          referencia_omie_codigo: number | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: Database["public"]["Enums"]["pendencia_status"]
          tipo: Database["public"]["Enums"]["pendencia_tipo"]
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          origem: Database["public"]["Enums"]["pendencia_origem"]
          projeto_id?: string | null
          referencia_id: string
          referencia_omie_codigo?: number | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["pendencia_status"]
          tipo: Database["public"]["Enums"]["pendencia_tipo"]
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          origem?: Database["public"]["Enums"]["pendencia_origem"]
          projeto_id?: string | null
          referencia_id?: string
          referencia_omie_codigo?: number | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["pendencia_status"]
          tipo?: Database["public"]["Enums"]["pendencia_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "pendencias_financeiras_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pendencias_financeiras_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_custo_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "pendencias_financeiras_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
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
          aprovacao_status:
            | Database["public"]["Enums"]["aprovacao_status"]
            | null
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          created_by: string | null
          data_fim_planejada: string | null
          data_fim_real: string | null
          data_inicio_planejada: string | null
          data_inicio_real: string | null
          descricao: string | null
          empresa_id: string
          horas_previstas: number | null
          id: string
          is_sistema: boolean | null
          motivo_reprovacao: string | null
          nome: string
          observacoes_aditivos: string | null
          observacoes_riscos: string | null
          omie_codigo: number | null
          omie_codint: string | null
          omie_last_error: string | null
          omie_last_sync_at: string | null
          omie_sync_status: string | null
          os: string
          regua_projeto_valor: number | null
          risco_escopo: Database["public"]["Enums"]["nivel_risco"] | null
          risco_liberacao_cliente:
            | Database["public"]["Enums"]["nivel_risco"]
            | null
          solicitado_em: string | null
          solicitado_por: string | null
          status: string
          status_projeto: Database["public"]["Enums"]["status_projeto"] | null
          tem_aditivos: boolean | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"] | null
          updated_at: string
          updated_by: string | null
          valor_aditivos_previsto: number | null
          valor_contrato: number | null
        }
        Insert: {
          aprovacao_status?:
            | Database["public"]["Enums"]["aprovacao_status"]
            | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_fim_planejada?: string | null
          data_fim_real?: string | null
          data_inicio_planejada?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          empresa_id: string
          horas_previstas?: number | null
          id?: string
          is_sistema?: boolean | null
          motivo_reprovacao?: string | null
          nome: string
          observacoes_aditivos?: string | null
          observacoes_riscos?: string | null
          omie_codigo?: number | null
          omie_codint?: string | null
          omie_last_error?: string | null
          omie_last_sync_at?: string | null
          omie_sync_status?: string | null
          os: string
          regua_projeto_valor?: number | null
          risco_escopo?: Database["public"]["Enums"]["nivel_risco"] | null
          risco_liberacao_cliente?:
            | Database["public"]["Enums"]["nivel_risco"]
            | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          status?: string
          status_projeto?: Database["public"]["Enums"]["status_projeto"] | null
          tem_aditivos?: boolean | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"] | null
          updated_at?: string
          updated_by?: string | null
          valor_aditivos_previsto?: number | null
          valor_contrato?: number | null
        }
        Update: {
          aprovacao_status?:
            | Database["public"]["Enums"]["aprovacao_status"]
            | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_fim_planejada?: string | null
          data_fim_real?: string | null
          data_inicio_planejada?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          empresa_id?: string
          horas_previstas?: number | null
          id?: string
          is_sistema?: boolean | null
          motivo_reprovacao?: string | null
          nome?: string
          observacoes_aditivos?: string | null
          observacoes_riscos?: string | null
          omie_codigo?: number | null
          omie_codint?: string | null
          omie_last_error?: string | null
          omie_last_sync_at?: string | null
          omie_sync_status?: string | null
          os?: string
          regua_projeto_valor?: number | null
          risco_escopo?: Database["public"]["Enums"]["nivel_risco"] | null
          risco_liberacao_cliente?:
            | Database["public"]["Enums"]["nivel_risco"]
            | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          status?: string
          status_projeto?: Database["public"]["Enums"]["status_projeto"] | null
          tem_aditivos?: boolean | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"] | null
          updated_at?: string
          updated_by?: string | null
          valor_aditivos_previsto?: number | null
          valor_contrato?: number | null
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
      site_maintenance_catalog: {
        Row: {
          created_at: string
          descricao: string
          id: string
          valor_mensal_ref: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          valor_mensal_ref?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          valor_mensal_ref?: number
        }
        Relationships: []
      }
      site_maintenance_items: {
        Row: {
          created_at: string
          descricao: string
          id: string
          meses: number
          revision_id: string
          total: number
          valor_mensal: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          meses?: number
          revision_id: string
          total?: number
          valor_mensal?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          meses?: number
          revision_id?: string
          total?: number
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_maintenance_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rule_sets: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tax_rules: {
        Row: {
          aplica_em: Database["public"]["Enums"]["tax_scope"]
          ativo: boolean
          base: Database["public"]["Enums"]["tax_base"]
          created_at: string
          id: string
          nome: string
          revision_id: string
          tipo: Database["public"]["Enums"]["tax_value_type"]
          valor: number
        }
        Insert: {
          aplica_em?: Database["public"]["Enums"]["tax_scope"]
          ativo?: boolean
          base?: Database["public"]["Enums"]["tax_base"]
          created_at?: string
          id?: string
          nome: string
          revision_id: string
          tipo?: Database["public"]["Enums"]["tax_value_type"]
          valor?: number
        }
        Update: {
          aplica_em?: Database["public"]["Enums"]["tax_scope"]
          ativo?: boolean
          base?: Database["public"]["Enums"]["tax_base"]
          created_at?: string
          id?: string
          nome?: string
          revision_id?: string
          tipo?: Database["public"]["Enums"]["tax_value_type"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rules_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rules_catalog: {
        Row: {
          base: Database["public"]["Enums"]["tax_base"]
          escopo: Database["public"]["Enums"]["tax_scope"]
          id: string
          nome: string
          ordem: number
          set_id: string
          sigla: string
          tipo_valor: Database["public"]["Enums"]["tax_value_type"]
          valor: number
        }
        Insert: {
          base?: Database["public"]["Enums"]["tax_base"]
          escopo?: Database["public"]["Enums"]["tax_scope"]
          id?: string
          nome: string
          ordem?: number
          set_id: string
          sigla: string
          tipo_valor?: Database["public"]["Enums"]["tax_value_type"]
          valor?: number
        }
        Update: {
          base?: Database["public"]["Enums"]["tax_base"]
          escopo?: Database["public"]["Enums"]["tax_scope"]
          id?: string
          nome?: string
          ordem?: number
          set_id?: string
          sigla?: string
          tipo_valor?: Database["public"]["Enums"]["tax_value_type"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rules_catalog_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "tax_rule_sets"
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
      wbs_template_items: {
        Row: {
          code: string
          id: string
          nome: string
          ordem: number
          parent_code: string | null
          template_id: string
          tipo: Database["public"]["Enums"]["wbs_type"]
        }
        Insert: {
          code: string
          id?: string
          nome: string
          ordem?: number
          parent_code?: string | null
          template_id: string
          tipo?: Database["public"]["Enums"]["wbs_type"]
        }
        Update: {
          code?: string
          id?: string
          nome?: string
          ordem?: number
          parent_code?: string | null
          template_id?: string
          tipo?: Database["public"]["Enums"]["wbs_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wbs_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wbs_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wbs_templates: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_apontamentos_consolidado: {
        Row: {
          arquivo_importacao_id: string | null
          centro_custo: string | null
          cpf: string | null
          created_at: string | null
          data_apontamento: string | null
          data_atualizacao_gantt: string | null
          data_importacao: string | null
          descricao: string | null
          funcionario_id: string | null
          gantt_atualizado: boolean | null
          horas: number | null
          id: string | null
          is_pending: boolean | null
          linha_arquivo: number | null
          motivo_erro: string | null
          nome_funcionario: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["apontamento_origem"] | null
          os_numero: string | null
          projeto_id: string | null
          projeto_nome: string | null
          status_apontamento:
            | Database["public"]["Enums"]["apontamento_status"]
            | null
          status_integracao:
            | Database["public"]["Enums"]["integracao_status"]
            | null
          tarefa_id: string | null
          tarefa_nome: string | null
          tipo_hora: Database["public"]["Enums"]["tipo_hora"] | null
          updated_at: string | null
          usuario_lancamento: string | null
        }
        Relationships: []
      }
      vw_budget_equipment: {
        Row: {
          catalog_id: string | null
          descricao: string | null
          from_catalog: boolean | null
          id: string | null
          meses: number | null
          quantidade: number | null
          revision_id: string | null
          total: number | null
          valor_mensal: number | null
          valor_referencia: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rentals_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_rentals_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_rentals_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_budget_labor_roles: {
        Row: {
          ativo: boolean | null
          carga_horaria_mensal: number | null
          catalog_id: string | null
          from_catalog: boolean | null
          funcao: string | null
          id: string | null
          modalidade: Database["public"]["Enums"]["labor_modality"] | null
          revision_id: string | null
          salario_base: number | null
          salario_referencia: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_roles_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "labor_role_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_roles_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_budget_materials: {
        Row: {
          catalog_id: string | null
          categoria: string | null
          codigo: string | null
          descricao: string | null
          fator_dificuldade: number | null
          fornecimento: Database["public"]["Enums"]["supply_type"] | null
          from_catalog: boolean | null
          hh_total: number | null
          hh_unitario_ref: number | null
          id: string | null
          item_seq: number | null
          observacao: string | null
          preco_referencia: number | null
          preco_total: number | null
          preco_unit: number | null
          quantidade: number | null
          revision_id: string | null
          unidade: string | null
          wbs_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_material_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "material_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_material_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_material_items_wbs_id_fkey"
            columns: ["wbs_id"]
            isOneToOne: false
            referencedRelation: "budget_wbs"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_budget_taxes: {
        Row: {
          aliquota: number | null
          aliquota_referencia: number | null
          ativo: boolean | null
          base: Database["public"]["Enums"]["tax_base"] | null
          created_at: string | null
          escopo: Database["public"]["Enums"]["tax_scope"] | null
          id: string | null
          nome: string | null
          revision_id: string | null
          sigla: string | null
          tax_catalog_id: string | null
          tipo_valor: Database["public"]["Enums"]["tax_value_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_taxes_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "budget_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_taxes_tax_catalog_id_fkey"
            columns: ["tax_catalog_id"]
            isOneToOne: false
            referencedRelation: "tax_rules_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custo_projeto: {
        Row: {
          custo_mao_obra: number | null
          custo_material: number | null
          custo_medio_hora: number | null
          custo_outro: number | null
          custo_servico: number | null
          custo_total: number | null
          empresa_nome: string | null
          horas_totais: number | null
          projeto_id: string | null
          projeto_nome: string | null
          projeto_os: string | null
          registros_mo_ok: number | null
          registros_sem_custo: number | null
          total_custos_diretos: number | null
        }
        Relationships: []
      }
      vw_rentabilidade_projeto: {
        Row: {
          a_pagar: number | null
          a_receber: number | null
          cliente_codigo: string | null
          cliente_nome: string | null
          custo_direto_caixa: number | null
          custo_direto_competencia: number | null
          custo_mao_obra: number | null
          custo_medio_hora: number | null
          data_fim_planejada: string | null
          data_fim_real: string | null
          data_inicio_planejada: string | null
          data_inicio_real: string | null
          desvio_horas: number | null
          desvio_horas_pct: number | null
          empresa_id: string | null
          horas_previstas: number | null
          horas_totais: number | null
          margem_caixa_pct: number | null
          margem_competencia_pct: number | null
          omie_codigo: number | null
          pendencias_abertas: number | null
          projeto_id: string | null
          projeto_nome: string | null
          projeto_os: string | null
          receita_caixa: number | null
          receita_competencia: number | null
          receita_por_hora: number | null
          registros_sem_custo: number | null
          resultado_competencia: number | null
          saldo_caixa: number | null
          status_margem: string | null
          status_projeto: Database["public"]["Enums"]["status_projeto"] | null
          tem_aditivos: boolean | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"] | null
          titulos_atrasados_ap: number | null
          titulos_atrasados_ar: number | null
          valor_aditivos_previsto: number | null
          valor_contrato: number | null
          valor_total_contrato: number | null
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
    }
    Functions: {
      can_approve_projects: { Args: { _user_id: string }; Returns: boolean }
      generate_next_budget_number: { Args: never; Returns: string }
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
      obter_custo_vigente: {
        Args: {
          p_colaborador_id: string
          p_data: string
          p_horas_100?: number
          p_horas_50?: number
          p_horas_normais?: number
        }
        Returns: {
          beneficios: number
          classificacao: string
          colaborador_id: string
          custo_hora_homem: number
          custo_id: string
          custo_mensal_total: number
          encargos: number
          fgts_t: number
          horas_totais: number
          periculosidade_valor: number
          prov_13: number
          prov_ferias: number
          prov_rescisao: number
          provisoes_t: number
          salario_base: number
          salario_t: number
        }[]
      }
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
      aprovacao_status:
        | "RASCUNHO"
        | "PENDENTE_APROVACAO"
        | "APROVADO"
        | "REPROVADO"
      custo_status: "OK" | "SEM_CUSTO"
      employee_status: "ativo" | "afastado" | "desligado"
      empresa_status: "ativo" | "inativo"
      eng_type: "HH" | "FECHADO"
      gen_status: "PENDENTE" | "APLICADO"
      hh_origin: "MATERIAIS" | "MANUAL"
      integracao_status: "OK" | "ERRO" | "PENDENTE"
      labor_modality: "CLT" | "PACOTE"
      nivel_risco: "BAIXO" | "MEDIO" | "ALTO"
      pendencia_origem: "OMIE_AR" | "OMIE_AP" | "HORAS"
      pendencia_status: "ABERTA" | "RESOLVIDA" | "IGNORADA"
      pendencia_tipo:
        | "SEM_PROJETO"
        | "PROJETO_INEXISTENTE"
        | "SEM_CATEGORIA"
        | "APONTAMENTO_SEM_CUSTO"
        | "OUTRO"
      revision_status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CANCELED"
      status_projeto: "ATIVO" | "CONCLUIDO" | "SUSPENSO" | "CANCELADO"
      supply_type: "CONCEPT" | "CLIENTE" | "TERCEIRO" | "A_DEFINIR"
      sync_status: "INICIADO" | "SUCESSO" | "ERRO" | "PARCIAL"
      sync_tipo: "CONTAS_RECEBER" | "CONTAS_PAGAR" | "PROJETOS"
      tax_base: "SALE" | "COST"
      tax_scope: "ALL" | "MATERIALS" | "SERVICES"
      tax_value_type: "PERCENT" | "FIXED"
      tipo_contrato: "PRECO_FECHADO" | "MAO_DE_OBRA"
      tipo_hora: "NORMAL" | "H50" | "H100" | "NOTURNA"
      titulo_status: "ABERTO" | "PAGO" | "ATRASADO" | "CANCELADO" | "PARCIAL"
      wbs_type: "CHAPTER" | "PACKAGE" | "ACTIVITY"
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
      aprovacao_status: [
        "RASCUNHO",
        "PENDENTE_APROVACAO",
        "APROVADO",
        "REPROVADO",
      ],
      custo_status: ["OK", "SEM_CUSTO"],
      employee_status: ["ativo", "afastado", "desligado"],
      empresa_status: ["ativo", "inativo"],
      eng_type: ["HH", "FECHADO"],
      gen_status: ["PENDENTE", "APLICADO"],
      hh_origin: ["MATERIAIS", "MANUAL"],
      integracao_status: ["OK", "ERRO", "PENDENTE"],
      labor_modality: ["CLT", "PACOTE"],
      nivel_risco: ["BAIXO", "MEDIO", "ALTO"],
      pendencia_origem: ["OMIE_AR", "OMIE_AP", "HORAS"],
      pendencia_status: ["ABERTA", "RESOLVIDA", "IGNORADA"],
      pendencia_tipo: [
        "SEM_PROJETO",
        "PROJETO_INEXISTENTE",
        "SEM_CATEGORIA",
        "APONTAMENTO_SEM_CUSTO",
        "OUTRO",
      ],
      revision_status: ["DRAFT", "SENT", "APPROVED", "REJECTED", "CANCELED"],
      status_projeto: ["ATIVO", "CONCLUIDO", "SUSPENSO", "CANCELADO"],
      supply_type: ["CONCEPT", "CLIENTE", "TERCEIRO", "A_DEFINIR"],
      sync_status: ["INICIADO", "SUCESSO", "ERRO", "PARCIAL"],
      sync_tipo: ["CONTAS_RECEBER", "CONTAS_PAGAR", "PROJETOS"],
      tax_base: ["SALE", "COST"],
      tax_scope: ["ALL", "MATERIALS", "SERVICES"],
      tax_value_type: ["PERCENT", "FIXED"],
      tipo_contrato: ["PRECO_FECHADO", "MAO_DE_OBRA"],
      tipo_hora: ["NORMAL", "H50", "H100", "NOTURNA"],
      titulo_status: ["ABERTO", "PAGO", "ATRASADO", "CANCELADO", "PARCIAL"],
      wbs_type: ["CHAPTER", "PACKAGE", "ACTIVITY"],
    },
  },
} as const
