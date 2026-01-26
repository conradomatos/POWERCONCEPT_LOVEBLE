import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaxRuleSet {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
  items?: TaxRuleItem[];
}

export interface TaxRuleItem {
  id: string;
  set_id: string;
  nome: string;
  sigla: string;
  tipo_valor: 'PERCENT' | 'FIXED';
  valor: number;
  base: 'SALE' | 'COST';
  escopo: 'ALL' | 'MATERIALS' | 'SERVICES';
  ordem: number;
}

export interface TaxRuleSetFormData {
  nome: string;
  descricao?: string | null;
}

export interface TaxRuleItemFormData {
  set_id: string;
  nome: string;
  sigla: string;
  tipo_valor?: 'PERCENT' | 'FIXED';
  valor?: number;
  base?: 'SALE' | 'COST';
  escopo?: 'ALL' | 'MATERIALS' | 'SERVICES';
  ordem?: number;
}

export function useTaxRulesCatalog() {
  const queryClient = useQueryClient();

  // Fetch all tax rule sets with their items
  const { data: sets = [], isLoading } = useQuery({
    queryKey: ['tax-rule-sets-catalog'],
    queryFn: async () => {
      const { data: setsData, error: setsError } = await supabase
        .from('tax_rule_sets')
        .select('*')
        .order('nome');

      if (setsError) throw setsError;

      // Fetch items for all sets
      const { data: itemsData, error: itemsError } = await supabase
        .from('tax_rules_catalog')
        .select('*')
        .order('ordem');

      if (itemsError) throw itemsError;

      // Group items by set_id
      const itemsBySet: Record<string, TaxRuleItem[]> = {};
      (itemsData || []).forEach((item: TaxRuleItem) => {
        if (!itemsBySet[item.set_id]) itemsBySet[item.set_id] = [];
        itemsBySet[item.set_id].push(item);
      });

      return setsData.map((set: TaxRuleSet) => ({
        ...set,
        items: itemsBySet[set.id] || [],
      })) as TaxRuleSet[];
    },
  });

  // Create a new tax rule set
  const createSet = useMutation({
    mutationFn: async (formData: TaxRuleSetFormData) => {
      const { data, error } = await supabase
        .from('tax_rule_sets')
        .insert(formData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rule-sets-catalog'] });
      toast.success('Conjunto de impostos criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conjunto: ${error.message}`);
    },
  });

  // Update a tax rule set
  const updateSet = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<TaxRuleSet> & { id: string }) => {
      const { items, created_at, ...updateData } = formData as any;
      const { data, error } = await supabase
        .from('tax_rule_sets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rule-sets-catalog'] });
      toast.success('Conjunto atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar conjunto: ${error.message}`);
    },
  });

  // Delete a tax rule set
  const deleteSet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_rule_sets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rule-sets-catalog'] });
      toast.success('Conjunto removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover conjunto: ${error.message}`);
    },
  });

  // Create a new tax rule item
  const createItem = useMutation({
    mutationFn: async (formData: TaxRuleItemFormData) => {
      const { data, error } = await supabase
        .from('tax_rules_catalog')
        .insert({
          set_id: formData.set_id,
          nome: formData.nome,
          sigla: formData.sigla,
          tipo_valor: formData.tipo_valor || 'PERCENT',
          valor: formData.valor ?? 0,
          base: formData.base || 'SALE',
          escopo: formData.escopo || 'ALL',
          ordem: formData.ordem ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rule-sets-catalog'] });
      toast.success('Imposto adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar imposto: ${error.message}`);
    },
  });

  // Update a tax rule item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<TaxRuleItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('tax_rules_catalog')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rule-sets-catalog'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar imposto: ${error.message}`);
    },
  });

  // Delete a tax rule item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_rules_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rule-sets-catalog'] });
      toast.success('Imposto removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover imposto: ${error.message}`);
    },
  });

  return {
    sets,
    isLoading,
    createSet,
    updateSet,
    deleteSet,
    createItem,
    updateItem,
    deleteItem,
  };
}
