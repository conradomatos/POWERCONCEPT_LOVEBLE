import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ========== Types ==========

type ItemStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

export interface ApontamentoItemLocal {
  id?: string;
  projeto_id: string;
  projeto_os: string;
  projeto_nome: string;
  is_sistema: boolean;
  horas: number;
  descricao: string | null;
  status: ItemStatus;
}

export interface ProjetoDisponivel {
  id: string;
  nome: string;
  os: string;
  is_sistema: boolean;
}

interface DiaInfo {
  id: string;
  colaborador_id: string;
  data: string;
}

// ========== Main Hook ==========

export function useApontamentoSimplificado(colaboradorId: string | null, data: string) {
  // Unified state for all items
  const [items, setItems] = useState<ApontamentoItemLocal[]>([]);
  const [diaInfo, setDiaInfo] = useState<DiaInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastLoadKey, setLastLoadKey] = useState<string>('');

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

  // Load data from DB when colaborador/date changes
  useEffect(() => {
    const loadKey = `${colaboradorId}-${data}`;
    
    // Skip if same key or missing required params
    if (!colaboradorId || !data || !projetos || loadKey === lastLoadKey) return;

    const loadData = async () => {
      setIsInitialized(false);
      
      // 1. Fetch apontamento_dia
      const { data: dia, error: diaError } = await supabase
        .from('apontamento_dia')
        .select('id, colaborador_id, data, total_horas_apontadas')
        .eq('colaborador_id', colaboradorId)
        .eq('data', data)
        .maybeSingle();

      if (diaError) {
        console.error('Error loading apontamento_dia:', diaError);
        setItems([]);
        setDiaInfo(null);
        setIsInitialized(true);
        setLastLoadKey(loadKey);
        return;
      }

      if (!dia) {
        setItems([]);
        setDiaInfo(null);
        setIsInitialized(true);
        setLastLoadKey(loadKey);
        return;
      }

      setDiaInfo({
        id: dia.id,
        colaborador_id: dia.colaborador_id,
        data: dia.data,
      });

      // 2. Fetch existing items
      const { data: existingItems, error: itemsError } = await supabase
        .from('apontamento_item')
        .select('id, projeto_id, horas, descricao')
        .eq('apontamento_dia_id', dia.id);

      if (itemsError) {
        console.error('Error loading items:', itemsError);
        setItems([]);
        setIsInitialized(true);
        setLastLoadKey(loadKey);
        return;
      }

      // 3. Merge with project info
      const loadedItems: ApontamentoItemLocal[] = (existingItems || []).map(item => {
        const projeto = projetos.find(p => p.id === item.projeto_id);
        return {
          id: item.id,
          projeto_id: item.projeto_id,
          projeto_os: projeto?.os || '',
          projeto_nome: projeto?.nome || '',
          is_sistema: projeto?.is_sistema || false,
          horas: Number(item.horas) || 0,
          descricao: item.descricao,
          status: 'unchanged' as const,
        };
      });

      setItems(loadedItems);
      setIsInitialized(true);
      setLastLoadKey(loadKey);
    };

    loadData();
  }, [colaboradorId, data, projetos, lastLoadKey]);

  // ========== Item Manipulation Functions ==========

  const addItem = useCallback((projetoId: string, horas: number, descricao?: string | null) => {
    const projeto = projetos?.find(p => p.id === projetoId);
    if (!projeto) return;

    setItems(prev => [
      ...prev,
      {
        projeto_id: projetoId,
        projeto_os: projeto.os,
        projeto_nome: projeto.nome,
        is_sistema: projeto.is_sistema || false,
        horas,
        descricao: descricao ?? null,
        status: 'new',
      },
    ]);
  }, [projetos]);

  const updateHoras = useCallback((projetoId: string, horas: number | null) => {
    setItems(prev => prev.map(item => {
      if (item.projeto_id !== projetoId) return item;
      return {
        ...item,
        horas: horas ?? 0,
        status: item.status === 'new' ? 'new' : 'modified',
      };
    }));
  }, []);

  const updateDescricao = useCallback((projetoId: string, descricao: string | null) => {
    setItems(prev => prev.map(item => {
      if (item.projeto_id !== projetoId) return item;
      return {
        ...item,
        descricao,
        status: item.status === 'new' ? 'new' : 'modified',
      };
    }));
  }, []);

  const removeItem = useCallback((projetoId: string) => {
    setItems(prev => {
      const item = prev.find(i => i.projeto_id === projetoId);
      if (!item) return prev;

      // If it's new (no id), just remove from array
      if (item.status === 'new' || !item.id) {
        return prev.filter(i => i.projeto_id !== projetoId);
      }

      // If exists in DB, mark for deletion
      return prev.map(i =>
        i.projeto_id === projetoId
          ? { ...i, status: 'deleted' as const }
          : i
      );
    });
  }, []);

  // ========== Save Function ==========

  const saveAll = useCallback(async () => {
    if (!colaboradorId) return;

    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // 1. Ensure apontamento_dia exists
      let diaId = diaInfo?.id;

      if (!diaId) {
        const { data: newDia, error: createError } = await supabase
          .from('apontamento_dia')
          .insert({
            colaborador_id: colaboradorId,
            data,
            status: 'RASCUNHO',
            created_by: userId,
            updated_by: userId,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        diaId = newDia.id;
      }

      // 2. Process each item based on status
      for (const item of items) {
        if (item.status === 'new') {
          // INSERT
          const { error } = await supabase.from('apontamento_item').insert({
            apontamento_dia_id: diaId,
            projeto_id: item.projeto_id,
            horas: item.horas,
            descricao: item.descricao,
            tipo_hora: 'NORMAL',
            is_overhead: item.is_sistema,
            created_by: userId,
            updated_by: userId,
          });
          if (error) throw error;
        } else if (item.status === 'modified' && item.id) {
          // UPDATE
          const { error } = await supabase
            .from('apontamento_item')
            .update({
              horas: item.horas,
              descricao: item.descricao,
              updated_by: userId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          if (error) throw error;
        } else if (item.status === 'deleted' && item.id) {
          // DELETE
          const { error } = await supabase
            .from('apontamento_item')
            .delete()
            .eq('id', item.id);
          if (error) throw error;
        }
      }

      // 3. Reload fresh data from DB
      const { data: freshItems } = await supabase
        .from('apontamento_item')
        .select('id, projeto_id, horas, descricao')
        .eq('apontamento_dia_id', diaId);

      // 4. Update local state with fresh data
      const newItems: ApontamentoItemLocal[] = (freshItems || []).map(item => {
        const projeto = projetos?.find(p => p.id === item.projeto_id);
        return {
          id: item.id,
          projeto_id: item.projeto_id,
          projeto_os: projeto?.os || '',
          projeto_nome: projeto?.nome || '',
          is_sistema: projeto?.is_sistema || false,
          horas: Number(item.horas) || 0,
          descricao: item.descricao,
          status: 'unchanged' as const,
        };
      });

      setItems(newItems);
      setDiaInfo({ id: diaId, colaborador_id: colaboradorId, data });

      toast.success('Horas salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar horas');
    } finally {
      setIsSaving(false);
    }
  }, [colaboradorId, data, diaInfo, items, projetos]);

  // ========== Derived Values ==========

  // Visible list (excludes deleted)
  const lancamentosDoDia = useMemo(() =>
    items
      .filter(i => i.status !== 'deleted')
      .sort((a, b) => a.projeto_os.localeCompare(b.projeto_os)),
    [items]
  );

  // Available projects (excludes already added)
  const projetosDisponiveis: ProjetoDisponivel[] = useMemo(() => {
    if (!projetos) return [];
    const usedIds = new Set(items.filter(i => i.status !== 'deleted').map(i => i.projeto_id));
    return projetos
      .filter(p => !usedIds.has(p.id))
      .map(p => ({
        id: p.id,
        nome: p.nome,
        os: p.os,
        is_sistema: p.is_sistema || false,
      }));
  }, [projetos, items]);

  // Total hours
  const totalHoras = useMemo(() =>
    lancamentosDoDia.reduce((sum, i) => sum + i.horas, 0),
    [lancamentosDoDia]
  );

  // Has unsaved changes?
  const hasChanges = useMemo(() =>
    items.some(i => i.status !== 'unchanged'),
    [items]
  );

  return {
    lancamentosDoDia,
    projetosDisponiveis,
    totalHoras,
    isLoading: isLoadingProjetos || !isInitialized,
    hasChanges,
    isSaving,
    addItem,
    removeItem,
    setHoras: updateHoras,
    setDescricao: updateDescricao,
    saveAll,
  };
}

// ========== Helper Hooks ==========

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
