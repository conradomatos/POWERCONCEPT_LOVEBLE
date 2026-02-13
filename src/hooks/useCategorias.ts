import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoriaContabil {
  id: string;
  grupo_nome: string;
  grupo_tipo: 'Receita' | 'Despesa';
  grupo_ordem: number;
  nome: string;
  conta_dre: string;
  tipo_gasto: string;
  keywords: string[];
  observacoes: string;
  ativa: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export type CategoriaInsert = Omit<CategoriaContabil, 'id' | 'created_at' | 'updated_at'>;
export type CategoriaUpdate = Partial<CategoriaInsert> & { id: string };

const QUERY_KEY = ['categorias-contabeis'];

export function useCategorias() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_contabeis')
        .select('*')
        .order('grupo_ordem', { ascending: true })
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as CategoriaContabil[];
    },
  });
}

export function useCategoriasAtivas() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_contabeis')
        .select('*')
        .eq('ativa', true)
        .order('grupo_ordem', { ascending: true })
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as CategoriaContabil[];
    },
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: CategoriaInsert) => {
      const { data, error } = await supabase
        .from('categorias_contabeis')
        .insert(cat)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CategoriaUpdate) => {
      const { data, error } = await supabase
        .from('categorias_contabeis')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias_contabeis')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useCheckMigration() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('categorias_contabeis')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}

export function useMigrarCategorias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const STORAGE_KEY = 'powerconcept_categorias_v2';
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) throw new Error('Nenhum dado local encontrado');

      const parsed = JSON.parse(stored);
      if (!parsed.grupos?.length || !parsed.categorias?.length) {
        throw new Error('Dados locais vazios');
      }

      const grupoMap = new Map<string, { nome: string; tipo: string; ordem: number }>();
      for (const g of parsed.grupos) {
        grupoMap.set(g.id, { nome: g.nome, tipo: g.tipo, ordem: g.ordem });
      }

      const rows: CategoriaInsert[] = [];
      for (const cat of parsed.categorias) {
        const grupo = grupoMap.get(cat.grupoId);
        if (!grupo) continue;
        rows.push({
          grupo_nome: grupo.nome,
          grupo_tipo: grupo.tipo as 'Receita' | 'Despesa',
          grupo_ordem: grupo.ordem,
          nome: cat.nome,
          conta_dre: cat.contaDRE || '',
          tipo_gasto: cat.tipoGasto || '',
          keywords: cat.keywords || [],
          observacoes: cat.observacoes || '',
          ativa: cat.ativa ?? true,
          ordem: cat.ordem || 0,
        });
      }

      if (rows.length === 0) throw new Error('Nenhuma categoria para migrar');

      // Batch insert (upsert to avoid dups)
      const { error } = await supabase
        .from('categorias_contabeis')
        .upsert(rows, { onConflict: 'nome' });
      if (error) throw error;

      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`${count} categorias migradas para a nuvem`);
    },
    onError: (err: Error) => {
      toast.error(`Erro na migração: ${err.message}`);
    },
  });
}
