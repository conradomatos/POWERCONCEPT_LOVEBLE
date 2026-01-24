import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PricebookType = 'MATERIAIS' | 'MO';

export interface Pricebook {
  id: string;
  nome: string;
  tipo: PricebookType;
  empresa_id: string | null;
  regiao_id: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  prioridade: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: { id: string; empresa: string; codigo: string } | null;
  regiao?: { id: string; nome: string; codigo: string } | null;
}

export interface Region {
  id: string;
  codigo: string;
  nome: string;
  uf: string | null;
  ativo: boolean;
}

export interface Fabricante {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface MaterialPriceItem {
  id: string;
  pricebook_id: string;
  catalog_id: string;
  fabricante_id: string | null;
  preco: number;
  moeda: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  fonte: string;
  updated_by: string | null;
  updated_at: string;
}

export interface MOPriceItem {
  id: string;
  pricebook_id: string;
  funcao_id: string;
  hh_custo: number;
  produtividade_valor: number | null;
  produtividade_tipo: 'HH_POR_UN' | 'UN_POR_HH' | null;
  produtividade_unidade: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  fonte: string;
  updated_by: string | null;
  updated_at: string;
}

export interface EffectiveMaterialPrice {
  preco: number;
  pricebook_id: string;
  pricebook_nome: string;
  origem: 'EMPRESA_REGIAO' | 'EMPRESA' | 'REGIAO' | 'GLOBAL';
  fabricante_id: string | null;
}

export interface EffectiveMOPrice {
  hh_custo: number;
  produtividade_valor: number | null;
  produtividade_tipo: 'HH_POR_UN' | 'UN_POR_HH' | null;
  produtividade_unidade: string | null;
  pricebook_id: string;
  pricebook_nome: string;
  origem: 'EMPRESA_REGIAO' | 'EMPRESA' | 'REGIAO' | 'GLOBAL';
}

// =============================================
// Hook: Regions
// =============================================
export function useRegions() {
  const queryClient = useQueryClient();

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ['budget-regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_regions')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as Region[];
    },
  });

  const createRegion = useMutation({
    mutationFn: async (data: Partial<Region>) => {
      const { data: result, error } = await supabase
        .from('budget_regions')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-regions'] });
      toast.success('Região criada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const upsertRegion = async (codigo: string, nome: string) => {
    const existing = regions.find(r => r.codigo === codigo);
    if (existing) return existing.id;
    const result = await createRegion.mutateAsync({ codigo, nome });
    return (result as Region).id;
  };

  return { regions, isLoading, createRegion, upsertRegion };
}

// =============================================
// Hook: Fabricantes
// =============================================
export function useFabricantes() {
  const queryClient = useQueryClient();

  const { data: fabricantes = [], isLoading } = useQuery({
    queryKey: ['budget-fabricantes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_fabricantes')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as Fabricante[];
    },
  });

  const createFabricante = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from('budget_fabricantes')
        .insert({ nome })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-fabricantes'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const upsertFabricante = async (nome: string): Promise<string> => {
    const existing = fabricantes.find(f => f.nome.toLowerCase() === nome.toLowerCase());
    if (existing) return existing.id;
    const result = await createFabricante.mutateAsync(nome);
    return result.id;
  };

  return { fabricantes, isLoading, createFabricante, upsertFabricante };
}

// =============================================
// Hook: Pricebooks
// =============================================
export function usePricebooks(tipo?: PricebookType) {
  const queryClient = useQueryClient();

  const { data: pricebooks = [], isLoading } = useQuery({
    queryKey: ['pricebooks', tipo],
    queryFn: async () => {
      let query = supabase
        .from('pricebooks')
        .select(`
          *,
          empresa:empresas(id, empresa, codigo),
          regiao:budget_regions(id, nome, codigo)
        `)
        .eq('ativo', true)
        .order('prioridade', { ascending: false });

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Pricebook[];
    },
  });

  const globalPricebook = pricebooks.find(p => !p.empresa_id && !p.regiao_id);

  const createPricebook = useMutation({
    mutationFn: async (data: Partial<Pricebook>) => {
      const { data: result, error } = await supabase
        .from('pricebooks')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebooks'] });
      toast.success('Tabela de preços criada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updatePricebook = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Pricebook> & { id: string }) => {
      const { empresa, regiao, ...cleanData } = data as any;
      const { data: result, error } = await supabase
        .from('pricebooks')
        .update(cleanData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebooks'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Get or create pricebook for given context
  const getOrCreatePricebook = async (
    tipo: PricebookType,
    empresaId: string | null,
    regiaoId: string | null
  ): Promise<string> => {
    // Find existing
    const existing = pricebooks.find(
      p => p.tipo === tipo && p.empresa_id === empresaId && p.regiao_id === regiaoId
    );
    if (existing) return existing.id;

    // Create new
    const nome = [
      empresaId ? 'Empresa' : null,
      regiaoId ? 'Região' : null,
      !empresaId && !regiaoId ? 'Global' : null,
    ].filter(Boolean).join(' + ') + ` - ${tipo === 'MATERIAIS' ? 'Materiais' : 'Mão de Obra'}`;

    const prioridade = (empresaId ? 2 : 0) + (regiaoId ? 1 : 0);

    const result = await createPricebook.mutateAsync({
      nome,
      tipo,
      empresa_id: empresaId,
      regiao_id: regiaoId,
      prioridade,
    });
    return (result as Pricebook).id;
  };

  return {
    pricebooks,
    globalPricebook,
    isLoading,
    createPricebook,
    updatePricebook,
    getOrCreatePricebook,
  };
}

// =============================================
// Hook: Material Price Items
// =============================================
export function useMaterialPriceItems(pricebookId?: string) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['material-pricebook-items', pricebookId],
    enabled: !!pricebookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_pricebook_items')
        .select('*')
        .eq('pricebook_id', pricebookId!);
      if (error) throw error;
      return data as MaterialPriceItem[];
    },
  });

  const upsertPrice = useMutation({
    mutationFn: async (data: Partial<MaterialPriceItem>) => {
      const { data: result, error } = await supabase
        .from('material_pricebook_items')
        .upsert(data as any, { onConflict: 'pricebook_id,catalog_id,fabricante_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-pricebook-items'] });
      queryClient.invalidateQueries({ queryKey: ['material-effective-prices'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { items, isLoading, upsertPrice };
}

// =============================================
// Hook: MO Price Items
// =============================================
export function useMOPriceItems(pricebookId?: string) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['mo-pricebook-items', pricebookId],
    enabled: !!pricebookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mo_pricebook_items')
        .select('*')
        .eq('pricebook_id', pricebookId!);
      if (error) throw error;
      return data as MOPriceItem[];
    },
  });

  const upsertPrice = useMutation({
    mutationFn: async (data: Partial<MOPriceItem>) => {
      const { data: result, error } = await supabase
        .from('mo_pricebook_items')
        .upsert(data as any, { onConflict: 'pricebook_id,funcao_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mo-pricebook-items'] });
      queryClient.invalidateQueries({ queryKey: ['mo-effective-prices'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { items, isLoading, upsertPrice };
}

// =============================================
// Hook: Effective Material Prices (with precedence)
// =============================================
export function useEffectiveMaterialPrices(
  catalogIds: string[],
  empresaId?: string | null,
  regiaoId?: string | null
) {
  return useQuery({
    queryKey: ['material-effective-prices', catalogIds, empresaId, regiaoId],
    enabled: catalogIds.length > 0,
    queryFn: async () => {
      const results: Record<string, EffectiveMaterialPrice | null> = {};

      for (const catalogId of catalogIds) {
        const { data, error } = await supabase.rpc('get_effective_material_price', {
          p_catalog_id: catalogId,
          p_empresa_id: empresaId || null,
          p_regiao_id: regiaoId || null,
          p_fabricante_id: null,
        });

        if (error) {
          console.error('Error fetching effective price:', error);
          results[catalogId] = null;
        } else if (data && data.length > 0) {
          results[catalogId] = data[0] as EffectiveMaterialPrice;
        } else {
          results[catalogId] = null;
        }
      }

      return results;
    },
  });
}

// =============================================
// Hook: Effective MO Prices (with precedence)
// =============================================
export function useEffectiveMOPrices(
  funcaoIds: string[],
  empresaId?: string | null,
  regiaoId?: string | null
) {
  return useQuery({
    queryKey: ['mo-effective-prices', funcaoIds, empresaId, regiaoId],
    enabled: funcaoIds.length > 0,
    queryFn: async () => {
      const results: Record<string, EffectiveMOPrice | null> = {};

      for (const funcaoId of funcaoIds) {
        const { data, error } = await supabase.rpc('get_effective_mo_price', {
          p_funcao_id: funcaoId,
          p_empresa_id: empresaId || null,
          p_regiao_id: regiaoId || null,
        });

        if (error) {
          console.error('Error fetching effective MO price:', error);
          results[funcaoId] = null;
        } else if (data && data.length > 0) {
          results[funcaoId] = data[0] as EffectiveMOPrice;
        } else {
          results[funcaoId] = null;
        }
      }

      return results;
    },
  });
}

// =============================================
// Hook: Empresas (for context selection)
// =============================================
export function useEmpresas() {
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, empresa, codigo')
        .eq('status', 'ativo')
        .order('empresa');
      if (error) throw error;
      return data;
    },
  });

  return { empresas, isLoading };
}
