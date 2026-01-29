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
  markedForDeletion?: boolean;
}

export interface ProjetoDisponivel {
  id: string;
  nome: string;
  os: string;
  is_sistema: boolean;
}

interface ApontamentoDiaSimples {
  id: string;
  colaborador_id: string;
  data: string;
  total_horas_apontadas: number;
}

export function useApontamentoSimplificado(colaboradorId: string | null, data: string) {
  const queryClient = useQueryClient();
  const [localChanges, setLocalChanges] = useState<Record<string, { horas: number | null; descricao: string | null; markedForDeletion?: boolean }>>({});
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

  // Merge projects with existing items - only show items that have hours or are in localChanges
  const lancamentosDoDia: ProjetoComHoras[] = useMemo(() => {
    if (!projetos) return [];
    
    const result: ProjetoComHoras[] = [];
    
    // First, add existing items from DB
    existingItems?.forEach(item => {
      const projeto = projetos.find(p => p.id === item.projeto_id);
      if (!projeto) return;
      
      const localChange = localChanges[item.projeto_id];
      
      // Skip if marked for deletion
      if (localChange?.markedForDeletion) return;
      
      result.push({
        projeto_id: item.projeto_id,
        projeto_nome: projeto.nome,
        projeto_os: projeto.os,
        is_sistema: projeto.is_sistema || false,
        horas: localChange?.horas !== undefined ? localChange.horas : item.horas,
        descricao: localChange?.descricao !== undefined ? localChange.descricao : item.descricao,
        item_id: item.id,
        changed: localChange !== undefined,
      });
    });
    
    // Then, add newly added items (from localChanges but not in existingItems)
    Object.entries(localChanges).forEach(([projetoId, change]) => {
      // Skip if already in result or marked for deletion
      if (result.find(r => r.projeto_id === projetoId) || change.markedForDeletion) return;
      
      const projeto = projetos.find(p => p.id === projetoId);
      if (!projeto) return;
      
      // Only add if has hours > 0
      if (change.horas && change.horas > 0) {
        result.push({
          projeto_id: projetoId,
          projeto_nome: projeto.nome,
          projeto_os: projeto.os,
          is_sistema: projeto.is_sistema || false,
          horas: change.horas,
          descricao: change.descricao,
          item_id: null,
          changed: true,
        });
      }
    });
    
    // Sort by OS
    result.sort((a, b) => a.projeto_os.localeCompare(b.projeto_os));
    
    return result;
  }, [projetos, existingItems, localChanges]);

  // Projects available for dropdown (excludes already added)
  const projetosDisponiveis: ProjetoDisponivel[] = useMemo(() => {
    if (!projetos) return [];
    
    const addedIds = new Set(lancamentosDoDia.map(l => l.projeto_id));
    
    return projetos
      .filter(p => !addedIds.has(p.id))
      .map(p => ({
        id: p.id,
        nome: p.nome,
        os: p.os,
        is_sistema: p.is_sistema || false,
      }));
  }, [projetos, lancamentosDoDia]);

  // Calculate total hours
  const totalHoras = useMemo(() => {
    return lancamentosDoDia.reduce((sum, p) => sum + (p.horas || 0), 0);
  }, [lancamentosDoDia]);

  // Add a new item to the list
  const addItem = useCallback((projetoId: string, horas: number, descricao?: string | null) => {
    setLocalChanges(prev => ({
      ...prev,
      [projetoId]: {
        horas,
        descricao: descricao ?? null,
      },
    }));
    setSavedProjects(prev => {
      const next = new Set(prev);
      next.delete(projetoId);
      return next;
    });
  }, []);

  // Remove an item from the list
  const removeItem = useCallback((projetoId: string) => {
    const existingItem = existingItems?.find(i => i.projeto_id === projetoId);
    
    if (existingItem) {
      // Mark for deletion if it exists in DB
      setLocalChanges(prev => ({
        ...prev,
        [projetoId]: {
          horas: 0,
          descricao: null,
          markedForDeletion: true,
        },
      }));
    } else {
      // Just remove from local changes if it was newly added
      setLocalChanges(prev => {
        const next = { ...prev };
        delete next[projetoId];
        return next;
      });
    }
    
    setSavedProjects(prev => {
      const next = new Set(prev);
      next.delete(projetoId);
      return next;
    });
  }, [existingItems]);

  // Update local hours for a project
  const setHoras = useCallback((projetoId: string, horas: number | null, descricao?: string | null) => {
    setLocalChanges(prev => ({
      ...prev,
      [projetoId]: {
        horas,
        descricao: descricao !== undefined ? descricao : (prev[projetoId]?.descricao ?? null),
        markedForDeletion: false,
      },
    }));
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
        markedForDeletion: false,
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
                horas_base_dia: null,
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
        for (const [projetoId, change] of Object.entries(localChanges)) {
          const existingItemId = currentItemsMap.get(projetoId);
          const horas = change.horas;
          const projeto = projetos?.find(p => p.id === projetoId);

          if (change.markedForDeletion && existingItemId) {
            // Delete the item
            await supabase
              .from('apontamento_item')
              .delete()
              .eq('id', existingItemId);
          } else if (horas && horas > 0) {
            if (existingItemId) {
              // Update existing
              await supabase
                .from('apontamento_item')
                .update({
                  horas,
                  descricao: change.descricao,
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
                  projeto_id: projetoId,
                  horas,
                  descricao: change.descricao,
                  tipo_hora: 'NORMAL',
                  is_overhead: projeto?.is_sistema || false,
                  created_by: userId,
                  updated_by: userId,
                });
            }
          } else if (existingItemId && (!horas || horas === 0)) {
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
    lancamentosDoDia,
    projetosDisponiveis,
    totalHoras,
    isLoading: isLoadingProjetos || isLoadingDia || isLoadingItems,
    hasChanges,
    addItem,
    removeItem,
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
