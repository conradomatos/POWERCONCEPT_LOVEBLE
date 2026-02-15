import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AIAgent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  system_prompt: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  temperature: number;
  max_tokens: number;
}

export function useAIAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ai_agents')
      .select('*')
      .order('created_at');
    setAgents((data || []) as unknown as AIAgent[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const createAgent = async (agent: { name: string; slug: string; description?: string; icon?: string; color?: string; system_prompt?: string }) => {
    if (!user) return;
    await supabase.from('ai_agents').insert({ ...agent, created_by: user.id } as any);
    await fetchAgents();
  };

  const updateAgent = async (id: string, updates: Partial<AIAgent>) => {
    await supabase.from('ai_agents').update(updates as any).eq('id', id);
    await fetchAgents();
  };

  const deleteAgent = async (id: string) => {
    await supabase.from('ai_agents').delete().eq('id', id);
    await fetchAgents();
  };

  return { agents, loading, createAgent, updateAgent, deleteAgent, refetch: fetchAgents };
}
