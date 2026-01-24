import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Types matching the database
export type ApontamentoDiaStatus = 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'BLOQUEADO';
export type ApontamentoFonteBase = 'PONTO' | 'JORNADA' | 'MANUAL';
export type TipoHoraExt = 'NORMAL' | 'EXTRA50' | 'EXTRA100' | 'DESLOCAMENTO' | 'TREINAMENTO' | 'ADM';

export interface ApontamentoDia {
  id: string;
  colaborador_id: string;
  data: string;
  horas_base_dia: number | null;
  total_horas_apontadas: number;
  status: ApontamentoDiaStatus;
  fonte_base: ApontamentoFonteBase | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  enviado_at: string | null;
  aprovado_at: string | null;
  bloqueado_at: string | null;
}

export interface ApontamentoItem {
  id: string;
  apontamento_dia_id: string;
  projeto_id: string;
  atividade_id: string | null;
  tipo_hora: TipoHoraExt;
  horas: number;
  descricao: string | null;
  centro_custo_id: string | null;
  is_overhead: boolean;
  custo_hora: number | null;
  custo_total: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  projeto?: {
    id: string;
    nome: string;
    os: string;
    status: string;
    is_sistema: boolean;
  };
}

export interface RateioDiaProjeto {
  colaborador_id: string;
  data: string;
  colaborador_nome: string;
  cpf: string;
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  projeto_status: string;
  dia_status: ApontamentoDiaStatus;
  horas_projeto_dia: number;
  horas_total_dia: number;
  percentual: number;
  custo_projeto_dia: number;
  is_overhead: boolean;
}

const TIPO_HORA_LABELS: Record<TipoHoraExt, string> = {
  NORMAL: 'Normal',
  EXTRA50: 'Extra 50%',
  EXTRA100: 'Extra 100%',
  DESLOCAMENTO: 'Deslocamento',
  TREINAMENTO: 'Treinamento',
  ADM: 'Administrativo',
};

const TIPO_HORA_FACTOR: Record<TipoHoraExt, number> = {
  NORMAL: 1.0,
  EXTRA50: 1.5,
  EXTRA100: 2.0,
  DESLOCAMENTO: 1.0,
  TREINAMENTO: 1.0,
  ADM: 1.0,
};

export function useApontamentoDiario(colaboradorId?: string, data?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['apontamento-dia', colaboradorId, data];

  // Fetch apontamento_dia for specific colaborador and date
  const { data: apontamentoDia, isLoading: isLoadingDia } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!colaboradorId || !data) return null;
      
      const { data: dia, error } = await supabase
        .from('apontamento_dia')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .eq('data', data)
        .maybeSingle();
      
      if (error) throw error;
      return dia as ApontamentoDia | null;
    },
    enabled: !!colaboradorId && !!data,
  });

  // Fetch items for the current apontamento_dia
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['apontamento-items', apontamentoDia?.id],
    queryFn: async () => {
      if (!apontamentoDia?.id) return [];
      
      const { data, error } = await supabase
        .from('apontamento_item')
        .select(`
          *,
          projeto:projetos(id, nome, os, status, is_sistema)
        `)
        .eq('apontamento_dia_id', apontamentoDia.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ApontamentoItem[];
    },
    enabled: !!apontamentoDia?.id,
  });

  // Fetch rateio summary
  const { data: rateio = [] } = useQuery({
    queryKey: ['rateio-dia-projeto', colaboradorId, data],
    queryFn: async () => {
      if (!colaboradorId || !data) return [];
      
      const { data: rateioData, error } = await supabase
        .from('vw_rateio_dia_projeto')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .eq('data', data);
      
      if (error) throw error;
      return rateioData as RateioDiaProjeto[];
    },
    enabled: !!colaboradorId && !!data,
  });

  // Create or get apontamento_dia
  const createOrGetDia = useMutation({
    mutationFn: async ({ colaboradorId, data, horasBase }: { 
      colaboradorId: string; 
      data: string; 
      horasBase?: number;
    }) => {
      // Check if exists
      const { data: existing } = await supabase
        .from('apontamento_dia')
        .select('id')
        .eq('colaborador_id', colaboradorId)
        .eq('data', data)
        .maybeSingle();
      
      if (existing) {
        return existing.id;
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      
      // Create new
      const { data: newDia, error } = await supabase
        .from('apontamento_dia')
        .insert({
          colaborador_id: colaboradorId,
          data,
          horas_base_dia: horasBase ?? 8,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return newDia.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Add item
  const addItem = useMutation({
    mutationFn: async (item: {
      projetoId: string;
      tipoHora: TipoHoraExt;
      horas: number;
      descricao?: string;
      isOverhead?: boolean;
    }) => {
      if (!apontamentoDia?.id) {
        throw new Error('Nenhum apontamento do dia encontrado');
      }

      if (apontamentoDia.status !== 'RASCUNHO') {
        throw new Error('Este apontamento não pode mais ser editado');
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('apontamento_item')
        .insert({
          apontamento_dia_id: apontamentoDia.id,
          projeto_id: item.projetoId,
          tipo_hora: item.tipoHora,
          horas: item.horas,
          descricao: item.descricao || null,
          is_overhead: item.isOverhead || false,
          created_by: userData.user?.id,
          updated_by: userData.user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamento-items', apontamentoDia?.id] });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['rateio-dia-projeto'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async ({ 
      itemId, 
      updates 
    }: { 
      itemId: string; 
      updates: Partial<{
        projeto_id: string;
        tipo_hora: TipoHoraExt;
        horas: number;
        descricao: string | null;
        is_overhead: boolean;
      }>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('apontamento_item')
        .update({
          ...updates,
          updated_by: userData.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamento-items', apontamentoDia?.id] });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['rateio-dia-projeto'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('apontamento_item')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamento-items', apontamentoDia?.id] });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['rateio-dia-projeto'] });
      toast.success('Item removido');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update dia status
  const updateDiaStatus = useMutation({
    mutationFn: async ({ status }: { status: ApontamentoDiaStatus }) => {
      if (!apontamentoDia?.id) {
        throw new Error('Nenhum apontamento do dia encontrado');
      }

      const { data: userData } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const updateData: Record<string, unknown> = {
        status,
        updated_by: userData.user?.id,
        updated_at: now,
      };

      // Set appropriate timestamp based on status
      if (status === 'ENVIADO') {
        updateData.enviado_at = now;
        updateData.enviado_by = userData.user?.id;
      } else if (status === 'APROVADO') {
        updateData.aprovado_at = now;
        updateData.aprovado_by = userData.user?.id;
      } else if (status === 'BLOQUEADO') {
        updateData.bloqueado_at = now;
        updateData.bloqueado_by = userData.user?.id;
      }

      const { error } = await supabase
        .from('apontamento_dia')
        .update(updateData)
        .eq('id', apontamentoDia.id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey });
      const messages: Record<ApontamentoDiaStatus, string> = {
        RASCUNHO: 'Apontamento reaberto como rascunho',
        ENVIADO: 'Apontamento enviado para aprovação',
        APROVADO: 'Apontamento aprovado',
        BLOQUEADO: 'Apontamento bloqueado',
      };
      toast.success(messages[status]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update horas_base_dia
  const updateHorasBase = useMutation({
    mutationFn: async (horasBase: number) => {
      if (!apontamentoDia?.id) {
        throw new Error('Nenhum apontamento do dia encontrado');
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('apontamento_dia')
        .update({
          horas_base_dia: horasBase,
          updated_by: userData.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', apontamentoDia.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update observacao
  const updateObservacao = useMutation({
    mutationFn: async (observacao: string) => {
      if (!apontamentoDia?.id) {
        throw new Error('Nenhum apontamento do dia encontrado');
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('apontamento_dia')
        .update({
          observacao,
          updated_by: userData.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', apontamentoDia.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Calculate saldo
  const saldoHoras = (apontamentoDia?.horas_base_dia ?? 0) - (apontamentoDia?.total_horas_apontadas ?? 0);

  // Check if can submit (total matches base with tolerance)
  const tolerancia = 0.25;
  const canSubmit = apontamentoDia?.status === 'RASCUNHO' && 
    items.length > 0 && 
    (apontamentoDia?.horas_base_dia === null || Math.abs(saldoHoras) <= tolerancia);

  // Check editability based on status
  const isEditable = apontamentoDia?.status === 'RASCUNHO';

  return {
    // Data
    apontamentoDia,
    items,
    rateio,
    saldoHoras,
    
    // Loading states
    isLoading: isLoadingDia || isLoadingItems,
    
    // Derived states
    canSubmit,
    isEditable,
    
    // Mutations
    createOrGetDia,
    addItem,
    updateItem,
    deleteItem,
    updateDiaStatus,
    updateHorasBase,
    updateObservacao,

    // Constants
    TIPO_HORA_LABELS,
    TIPO_HORA_FACTOR,
  };
}

// Hook for listing apontamentos (for approval view)
export function useApontamentosLista(filters?: {
  status?: ApontamentoDiaStatus;
  dataInicio?: string;
  dataFim?: string;
  colaboradorId?: string;
}) {
  return useQuery({
    queryKey: ['apontamentos-lista', filters],
    queryFn: async () => {
      let query = supabase
        .from('apontamento_dia')
        .select(`
          *,
          colaborador:collaborators(id, full_name, cpf, equipe)
        `)
        .order('data', { ascending: false })
        .limit(500);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dataInicio) {
        query = query.gte('data', filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte('data', filters.dataFim);
      }
      if (filters?.colaboradorId) {
        query = query.eq('colaborador_id', filters.colaboradorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Hook for fetching projetos for dropdown
export function useProjetosDropdown() {
  return useQuery({
    queryKey: ['projetos-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os, status, is_sistema')
        .order('os', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}
