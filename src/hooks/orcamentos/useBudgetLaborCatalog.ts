import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BudgetLaborType = 'MOD' | 'MOI';
export type BudgetLaborRegime = 'CLT' | 'PL';
export type BudgetProductivityType = 'HH_POR_UN' | 'UN_POR_HH';

export interface BudgetLaborCatalogItem {
  id: string;
  codigo: string;
  nome: string;
  tipo_mo: BudgetLaborType;
  regime: BudgetLaborRegime;
  carga_horaria_mensal: number;
  salario_base: number;
  beneficios_mensal: number;
  periculosidade_pct: number;
  insalubridade_pct: number;
  charge_set_id: string | null;
  hh_custo: number;
  produtividade_valor: number | null;
  produtividade_tipo: BudgetProductivityType;
  produtividade_unidade: string | null;
  group_id: string | null;
  category_id: string | null;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // View fields
  group_nome?: string | null;
  category_nome?: string | null;
  charge_set_nome?: string | null;
  total_encargos_pct?: number | null;
  // Tags joined
  tags?: { id: string; nome: string }[];
}

export interface BudgetLaborCatalogFormData {
  codigo: string;
  nome: string;
  tipo_mo?: BudgetLaborType;
  regime?: BudgetLaborRegime;
  carga_horaria_mensal?: number;
  salario_base?: number;
  beneficios_mensal?: number;
  periculosidade_pct?: number;
  insalubridade_pct?: number;
  charge_set_id?: string | null;
  produtividade_valor?: number | null;
  produtividade_tipo?: BudgetProductivityType;
  produtividade_unidade?: string | null;
  group_id?: string | null;
  category_id?: string | null;
  observacao?: string | null;
  ativo?: boolean;
}

export function useBudgetLaborCatalog() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['budget-labor-catalog'],
    queryFn: async () => {
      // Get items from view
      const { data, error } = await supabase
        .from('vw_budget_labor_roles_catalog')
        .select('*')
        .order('codigo');

      if (error) throw error;

      // Get tags for all items
      const itemIds = data.map((item: any) => item.id);
      if (itemIds.length > 0) {
        const { data: tagLinks } = await supabase
          .from('budget_labor_catalog_tags')
          .select('role_id, tag_id, budget_labor_tags(id, nome)')
          .in('role_id', itemIds);

        if (tagLinks) {
          const tagsByRole: Record<string, { id: string; nome: string }[]> = {};
          tagLinks.forEach((link: any) => {
            if (!tagsByRole[link.role_id]) tagsByRole[link.role_id] = [];
            if (link.budget_labor_tags) {
              tagsByRole[link.role_id].push(link.budget_labor_tags);
            }
          });

          return data.map((item: any) => ({
            ...item,
            tags: tagsByRole[item.id] || [],
          })) as BudgetLaborCatalogItem[];
        }
      }

      return data as BudgetLaborCatalogItem[];
    },
  });

  const createItem = useMutation({
    mutationFn: async (formData: BudgetLaborCatalogFormData) => {
      const { data, error } = await supabase
        .from('budget_labor_roles_catalog')
        .insert({
          codigo: formData.codigo,
          nome: formData.nome,
          tipo_mo: formData.tipo_mo || 'MOD',
          regime: formData.regime || 'CLT',
          carga_horaria_mensal: formData.carga_horaria_mensal ?? 220,
          salario_base: formData.salario_base ?? 0,
          beneficios_mensal: formData.beneficios_mensal ?? 0,
          periculosidade_pct: formData.periculosidade_pct ?? 0,
          insalubridade_pct: formData.insalubridade_pct ?? 0,
          charge_set_id: formData.charge_set_id || null,
          produtividade_valor: formData.produtividade_valor,
          produtividade_tipo: formData.produtividade_tipo || 'HH_POR_UN',
          produtividade_unidade: formData.produtividade_unidade,
          group_id: formData.group_id || null,
          category_id: formData.category_id || null,
          observacao: formData.observacao,
          ativo: formData.ativo ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-catalog'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar função: ${error.message}`);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<BudgetLaborCatalogItem> & { id: string }) => {
      // Remove computed/view fields
      const { 
        group_nome, category_nome, charge_set_nome, total_encargos_pct, 
        hh_custo, created_at, updated_at, tags, ...updateData 
      } = formData as any;

      const { data, error } = await supabase
        .from('budget_labor_roles_catalog')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-catalog'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar função: ${error.message}`);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_labor_roles_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-labor-catalog'] });
      toast.success('Função removida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover função: ${error.message}`);
    },
  });

  // Tag management
  const setItemTags = async (roleId: string, tagIds: string[]) => {
    // Delete existing
    await supabase
      .from('budget_labor_catalog_tags')
      .delete()
      .eq('role_id', roleId);

    // Insert new
    if (tagIds.length > 0) {
      const { error } = await supabase
        .from('budget_labor_catalog_tags')
        .insert(tagIds.map(tagId => ({ role_id: roleId, tag_id: tagId })));

      if (error) throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['budget-labor-catalog'] });
  };

  return {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    setItemTags,
  };
}
