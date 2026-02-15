import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AIMessage {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  agent_type: string | null;
  metadata: Record<string, unknown>;
  is_favorited: boolean;
  created_at: string;
}

export function useAIChat(threadId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as unknown as AIMessage[]);
    setLoading(false);
  }, [threadId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const sendMessage = async (content: string, agentType?: string) => {
    if (!threadId || !user || !content.trim()) return;
    setSending(true);
    setAgentStatus('pensando');

    // Save user message
    const { data: userMsg } = await supabase
      .from('ai_messages')
      .insert({ thread_id: threadId, role: 'user', content, agent_type: agentType })
      .select()
      .single();

    if (userMsg) setMessages(prev => [...prev, userMsg as unknown as AIMessage]);

    try {
      // Get API settings
      const { data: settings } = await supabase
        .from('ai_settings')
        .select('api_url, api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.api_url) {
        const errorMsg = 'Configure a URL da API em Configurações do AI Lab.';
        const { data: errMsg } = await supabase
          .from('ai_messages')
          .insert({ thread_id: threadId, role: 'assistant', content: errorMsg, agent_type: agentType })
          .select()
          .single();
        if (errMsg) setMessages(prev => [...prev, errMsg as unknown as AIMessage]);
        setSending(false);
        setAgentStatus(null);
        return;
      }

      // Call external API
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
      if (settings.api_key) headers['Authorization'] = `Bearer ${settings.api_key}`;

      const response = await fetch(`${settings.api_url}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          thread_id: threadId,
          user_id: user.id,
          agent_type: agentType || 'default',
        }),
        signal: AbortSignal.timeout(120000),
      });

      const result = await response.json();
      const assistantContent = result.response || result.message || 'Sem resposta do agente.';

      // Save assistant message
      const { data: assistantMsg } = await supabase
        .from('ai_messages')
        .insert({
          thread_id: threadId,
          role: 'assistant',
          content: assistantContent,
          agent_type: agentType,
          metadata: result.metadata || {},
        })
        .select()
        .single();

      if (assistantMsg) setMessages(prev => [...prev, assistantMsg as unknown as AIMessage]);

      // Update thread
      await supabase
        .from('ai_threads')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: messages.length + 2,
        })
        .eq('thread_id', threadId);
    } catch (err: any) {
      const errorContent = `Erro ao contactar o agente: ${err.message}`;
      const { data: errMsg } = await supabase
        .from('ai_messages')
        .insert({ thread_id: threadId, role: 'assistant', content: errorContent, agent_type: agentType })
        .select()
        .single();
      if (errMsg) setMessages(prev => [...prev, errMsg as unknown as AIMessage]);
    } finally {
      setSending(false);
      setAgentStatus(null);
    }
  };

  const toggleFavorite = async (messageId: string, current: boolean) => {
    await supabase.from('ai_messages').update({ is_favorited: !current }).eq('id', messageId);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_favorited: !current } : m));
  };

  return { messages, loading, sending, agentStatus, sendMessage, toggleFavorite, refetch: loadHistory };
}
