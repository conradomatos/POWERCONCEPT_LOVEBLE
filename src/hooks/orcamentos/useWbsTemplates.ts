import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type WbsTemplate = Database['public']['Tables']['wbs_templates']['Row'];
type WbsTemplateItem = Database['public']['Tables']['wbs_template_items']['Row'];

export interface WbsTemplateWithItems extends WbsTemplate {
  items?: WbsTemplateItem[];
}

export interface WbsTemplateFormData {
  nome: string;
  descricao?: string | null;
}

export interface WbsTemplateItemFormData {
  template_id: string;
  code: string;
  nome: string;
  tipo: 'CHAPTER' | 'PACKAGE' | 'ACTIVITY';
  parent_code?: string | null;
  ordem?: number;
}

export function useWbsTemplates() {
  const queryClient = useQueryClient();

  // List all templates with their items
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['wbs-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wbs_templates')
        .select('*, items:wbs_template_items(*)')
        .order('nome');

      if (error) throw error;
      return data as WbsTemplateWithItems[];
    },
  });

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (formData: WbsTemplateFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('wbs_templates')
        .insert({
          nome: formData.nome,
          descricao: formData.descricao ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  // Update template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<WbsTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('wbs_templates')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs-templates'] });
      toast.success('Template atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wbs_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs-templates'] });
      toast.success('Template excluído');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir template: ${error.message}`);
    },
  });

  // Create template item
  const createTemplateItem = useMutation({
    mutationFn: async (formData: WbsTemplateItemFormData) => {
      const { data, error } = await supabase
        .from('wbs_template_items')
        .insert(formData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs-templates'] });
      toast.success('Item adicionado ao template');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`);
    },
  });

  // Update template item
  const updateTemplateItem = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<WbsTemplateItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('wbs_template_items')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs-templates'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  // Delete template item
  const deleteTemplateItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wbs_template_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs-templates'] });
      toast.success('Item removido do template');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover item: ${error.message}`);
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createTemplateItem,
    updateTemplateItem,
    deleteTemplateItem,
  };
}
