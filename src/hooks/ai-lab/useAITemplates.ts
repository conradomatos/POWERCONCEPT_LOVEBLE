import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AITemplate {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  agent_type: string | null;
  usage_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATES = [
  { title: 'Análise de Composição de Custos', content: 'Analise a composição de custos do item {item}', category: 'custos' },
  { title: 'Relatório de Avanço Físico', content: 'Gere um relatório de avanço físico do projeto', category: 'relatorios' },
  { title: 'Auditoria de Notas Fiscais', content: 'Audite as notas fiscais do mês {mês}', category: 'auditoria' },
  { title: 'Orçado vs Realizado', content: 'Compare o orçado vs realizado e identifique desvios', category: 'custos' },
  { title: 'Cronograma Macro', content: 'Crie o cronograma macro para {escopo}', category: 'cronograma' },
];

export function useAITemplates(categoryFilter?: string) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('ai_prompt_templates').select('*').eq('user_id', user.id).order('usage_count', { ascending: false });
    if (categoryFilter) query = query.eq('category', categoryFilter);
    const { data } = await query;
    const list = (data || []) as unknown as AITemplate[];

    if (list.length === 0 && !categoryFilter) {
      const { data: seeded } = await supabase
        .from('ai_prompt_templates')
        .insert(DEFAULT_TEMPLATES.map(t => ({ ...t, user_id: user.id })))
        .select();
      setTemplates((seeded || []) as unknown as AITemplate[]);
    } else {
      setTemplates(list);
    }
    setLoading(false);
  }, [user, categoryFilter]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const createTemplate = async (template: Pick<AITemplate, 'title' | 'content' | 'category' | 'agent_type'>) => {
    if (!user) return;
    await supabase.from('ai_prompt_templates').insert({ ...template, user_id: user.id });
    await fetchTemplates();
  };

  const updateTemplate = async (id: string, updates: Partial<AITemplate>) => {
    await supabase.from('ai_prompt_templates').update(updates).eq('id', id);
    await fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from('ai_prompt_templates').delete().eq('id', id);
    await fetchTemplates();
  };

  const incrementUsage = async (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (tpl) {
      await supabase.from('ai_prompt_templates').update({ usage_count: tpl.usage_count + 1 }).eq('id', id);
    }
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    await supabase.from('ai_prompt_templates').update({ is_favorite: !current }).eq('id', id);
    await fetchTemplates();
  };

  return { templates, loading, createTemplate, updateTemplate, deleteTemplate, incrementUsage, toggleFavorite, refetch: fetchTemplates };
}
