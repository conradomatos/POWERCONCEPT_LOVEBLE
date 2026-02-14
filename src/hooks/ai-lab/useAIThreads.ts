import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AIThread {
  id: string;
  thread_id: string;
  title: string;
  description: string | null;
  agent_type: string;
  project_id: string | null;
  status: string;
  last_message_at: string | null;
  message_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useAIThreads(statusFilter?: string) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<AIThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeThreads: 0, totalMessages: 0 });

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('ai_threads')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (statusFilter) query = query.eq('status', statusFilter);

    const { data } = await query;
    const list = (data || []) as unknown as AIThread[];
    setThreads(list);
    setStats({
      activeThreads: list.filter(t => t.status === 'active').length,
      totalMessages: list.reduce((s, t) => s + (t.message_count || 0), 0),
    });
    setLoading(false);
  }, [user, statusFilter]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const createThread = async (title: string, description?: string, agentType?: string, projectId?: string) => {
    if (!user) return null;
    const threadId = `thread_${crypto.randomUUID()}`;
    const { data, error } = await supabase
      .from('ai_threads')
      .insert({
        user_id: user.id,
        thread_id: threadId,
        title,
        description: description || null,
        agent_type: agentType || 'default',
        project_id: projectId || null,
      })
      .select()
      .single();
    if (!error) await fetchThreads();
    return data as unknown as AIThread | null;
  };

  const updateThread = async (threadId: string, updates: Partial<Pick<AIThread, 'title' | 'status' | 'description'>>) => {
    const { error } = await supabase
      .from('ai_threads')
      .update(updates)
      .eq('thread_id', threadId);
    if (!error) await fetchThreads();
    return { error };
  };

  const deleteThread = async (threadId: string) => {
    const { error } = await supabase
      .from('ai_threads')
      .delete()
      .eq('thread_id', threadId);
    if (!error) await fetchThreads();
    return { error };
  };

  return { threads, loading, stats, createThread, updateThread, deleteThread, refetch: fetchThreads };
}
