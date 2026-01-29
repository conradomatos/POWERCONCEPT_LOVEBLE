import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjetoComHoras {
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  is_sistema: boolean;
  horas: number | null;
  descricao: string | null;
  item_id: string | null; // null = novo, uuid = existente
  changed: boolean;
}

interface ApontamentoDiaSimples {
  id: string;
  colaborador_id: string;
  data: string;
  total_horas_apontadas: number;
}

export function useApontamentoSimplificado(colaboradorId: string | null, data: string) {
  const queryClient = useQueryClient();
  const [localChanges, setLocalChanges] = useState<Record<string, { horas: number | null; descricao: string | null }>>({});
  const [savedProjects, setSavedProjects] = useState<Set<string>>(new Set());

  // Fetch active projects
  const { data: projetos, isLoading: isLoadingProjetos } = useQuery({
    queryKey: ['projetos-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os, status, is_sistema')
        .eq('status', 'ativo')
        .order('os', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing apontamento_dia
  const { data: apontamentoDia, isLoading: isLoadingDia } = useQuery({
    queryKey: ['apontamento-dia-simples', colaboradorId, data],
    queryFn: async () => {
      if (!colaboradorId) return null;
      const { data: dia, error } = await supabase
        .from('apontamento_dia')
        .select('id, colaborador_id, data, total_horas_apontadas')
        .eq('colaborador_id', colaboradorId)
        .eq('data', data)
        .maybeSingle();
      if (error) throw error;
      return dia as ApontamentoDiaSimples | null;
    },
    enabled: !!colaboradorId,
  });

  // Fetch existing items for the day
  const { data: existingItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['apontamento-items-simples', apontamentoDia?.id],
    queryFn: async () => {
      if (!apontamentoDia?.id) return [];
      const { data, error } = await supabase
        .from('apontamento_item')
        .select('id, projeto_id, horas, descricao')
        .eq('apontamento_dia_id', apontamentoDia.id);
      if (error) throw error;
      return data;
    },
    enabled: !!apontamentoDia?.id,
  });

  // Merge projects with existing items
  const projetosComHoras: ProjetoComHoras[] = useMemo(() => {
    if (!projetos) return [];
    
    return projetos.map(p => {
      const existingItem = existingItems?.find(i => i.projeto_id === p.id);
      const localChange = localChanges[p.id];
      
      return {
        projeto_id: p.id,
        projeto_nome: p.nome,
        projeto_os: p.os,
        is_sistema: p.is_sistema || false,
        horas: localChange?.horas !== undefined ? localChange.horas : (existingItem?.horas ?? null),
        descricao: localChange?.descricao !== undefined ? localChange.descricao : (existingItem?.descricao ?? null),
        item_id: existingItem?.id ?? null,
        changed: localChange !== undefined,
      };
    });
  }, [projetos, existingItems, localChanges]);

  // Calculate total hours
  const totalHoras = useMemo(() => {
    return projetosComHoras.reduce((sum, p) => sum + (p.horas || 0), 0);
  }, [projetosComHoras]);

  // Update local hours for a project
  const setHoras = useCallback((projetoId: string, horas: number | null, descricao?: string | null) => {
    setLocalChanges(prev => ({
      ...prev,
      [projetoId]: {
        horas,
        descricao: descricao !== undefined ? descricao : (prev[projetoId]?.descricao ?? null),
      },
    }));
    // Remove from saved set when changed again
    setSavedProjects(prev => {
      const next = new Set(prev);
      next.delete(projetoId);
      return next;
    });
  }, []);

  // Update description for a project
  const setDescricao = useCallback((projetoId: string, descricao: string | null) => {
    setLocalChanges(prev => ({
      ...prev,
      [projetoId]: {
        horas: prev[projetoId]?.horas ?? null,
        descricao,
      },
    }));
  }, []);

  // Save batch mutation
  const saveBatch = useMutation({
    mutationFn: async (colaboradorIds: string[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      for (const colabId of colaboradorIds) {
        // 1. Ensure apontamento_dia exists
        let diaId = apontamentoDia?.id;
        
        if (!diaId || colabId !== colaboradorId) {
          // Check if exists for this collaborator
          const { data: existingDia } = await supabase
            .from('apontamento_dia')
            .select('id')
            .eq('colaborador_id', colabId)
            .eq('data', data)
            .maybeSingle();

          if (existingDia) {
            diaId = existingDia.id;
          } else {
            // Create new
            const { data: newDia, error: createError } = await supabase
              .from('apontamento_dia')
              .insert({
                colaborador_id: colabId,
                data,
                horas_base_dia: null, // Not tracking base in simplified version
                created_by: userId,
                updated_by: userId,
                status: 'RASCUNHO',
              })
              .select('id')
              .single();

            if (createError) throw createError;
            diaId = newDia.id;
          }
        }

        // 2. Get existing items for this day
        const { data: currentItems } = await supabase
          .from('apontamento_item')
          .select('id, projeto_id')
          .eq('apontamento_dia_id', diaId);

        const currentItemsMap = new Map(currentItems?.map(i => [i.projeto_id, i.id]) || []);

        // 3. Process each project with changes
        for (const projeto of projetosComHoras) {
          if (!projeto.changed) continue;

          const existingItemId = currentItemsMap.get(projeto.projeto_id);
          const horas = projeto.horas;

          if (horas && horas > 0) {
            if (existingItemId) {
              // Update existing
              await supabase
                .from('apontamento_item')
                .update({
                  horas,
                  descricao: projeto.descricao,
                  updated_by: userId,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingItemId);
            } else {
              // Insert new
              await supabase
                .from('apontamento_item')
                .insert({
                  apontamento_dia_id: diaId,
                  projeto_id: projeto.projeto_id,
                  horas,
                  descricao: projeto.descricao,
                  tipo_hora: 'NORMAL',
                  is_overhead: projeto.is_sistema,
                  created_by: userId,
                  updated_by: userId,
                });
            }
          } else if (existingItemId) {
            // Delete if hours are 0 and item existed
            await supabase
              .from('apontamento_item')
              .delete()
              .eq('id', existingItemId);
          }
        }
      }
    },
    onSuccess: () => {
      // Mark all changed projects as saved
      const changedIds = Object.keys(localChanges);
      setSavedProjects(new Set(changedIds));
      
      // Clear local changes
      setLocalChanges({});
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['apontamento-dia-simples'] });
      queryClient.invalidateQueries({ queryKey: ['apontamento-items-simples'] });
      queryClient.invalidateQueries({ queryKey: ['apontamento-dia'] });
      queryClient.invalidateQueries({ queryKey: ['apontamento-items'] });
      
      toast.success('Horas salvas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  // Check if there are unsaved changes
  const hasChanges = Object.keys(localChanges).length > 0;

  // Check if a project was just saved
  const isProjectSaved = useCallback((projetoId: string) => {
    return savedProjects.has(projetoId);
  }, [savedProjects]);

  return {
    projetosComHoras,
    totalHoras,
    isLoading: isLoadingProjetos || isLoadingDia || isLoadingItems,
    hasChanges,
    setHoras,
    setDescricao,
    saveBatch,
    isProjectSaved,
  };
}

// Hook for fetching collaborators (for desktop multi-select)
export function useColaboradoresAtivos() {
  return useQuery({
    queryKey: ['colaboradores-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, cpf, equipe, user_id')
        .eq('status', 'ativo')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

// Hook to get the current user's linked collaborator
export function useMyColaborador(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-colaborador', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name')
        .eq('user_id', userId)
        .eq('status', 'ativo')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
