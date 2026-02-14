import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AIAgent {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_icon: string;
  avatar_color: string;
  system_prompt: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_AGENTS = [
  { name: 'Padrão', slug: 'default', description: 'Agente geral para qualquer consulta', avatar_icon: 'Bot', avatar_color: '#3b82f6' },
  { name: 'Engenheiro de Custos', slug: 'engineer', description: 'Especialista em orçamentos e composições', avatar_icon: 'HardHat', avatar_color: '#f59e0b' },
  { name: 'Auditor Fiscal', slug: 'auditor', description: 'Especialista em impostos e compliance', avatar_icon: 'Shield', avatar_color: '#ef4444' },
];

export function useAIAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('ai_agents').select('*').eq('user_id', user.id).order('created_at');
    const list = (data || []) as unknown as AIAgent[];

    if (list.length === 0) {
      // Seed defaults
      const { data: seeded } = await supabase
        .from('ai_agents')
        .insert(DEFAULT_AGENTS.map(a => ({ ...a, user_id: user.id })))
        .select();
      setAgents((seeded || []) as unknown as AIAgent[]);
    } else {
      setAgents(list);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const createAgent = async (agent: { name: string; slug: string; description?: string; avatar_icon?: string; avatar_color?: string; system_prompt?: string | null }) => {
    if (!user) return;
    await supabase.from('ai_agents').insert({ ...agent, user_id: user.id });
    await fetchAgents();
  };

  const updateAgent = async (id: string, updates: Partial<AIAgent>) => {
    await supabase.from('ai_agents').update(updates).eq('id', id);
    await fetchAgents();
  };

  const deleteAgent = async (id: string) => {
    await supabase.from('ai_agents').delete().eq('id', id);
    await fetchAgents();
  };

  return { agents, loading, createAgent, updateAgent, deleteAgent, refetch: fetchAgents };
}
