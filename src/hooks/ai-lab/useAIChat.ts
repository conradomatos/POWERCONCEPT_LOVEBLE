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
  agent_id: string | null;
  agent_name: string | null;
  agent_color: string | null;
  created_at: string;
}

interface AgentMeta {
  id: string;
  name: string;
  color: string;
  system_prompt: string;
  slug: string;
  temperature?: number;
  max_tokens?: number;
  knowledge_base?: string | null;
  example_responses?: string | null;
  model?: string;
  debate_posture?: string;
  max_response_length?: string;
}

const MEETING_PREFIX = `Você está numa reunião virtual com outros especialistas. Considere as respostas anteriores dos colegas antes de dar sua opinião. Se concordar, complemente. Se discordar, explique por quê.\n\n`;

export function useAIChat(threadId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [respondingAgent, setRespondingAgent] = useState<{ name: string; color: string } | null>(null);

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

  const getSettings = async () => {
    if (!user) return null;
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('api_url, api_key')
      .eq('user_id', user.id)
      .maybeSingle();
    return settings;
  };

  const fetchHistory = async () => {
    if (!threadId) return [];
    const { data: historyData } = await supabase
      .from('ai_messages')
      .select('role, content, agent_name')
      .eq('thread_id', threadId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
      .limit(20);
    return (historyData || []).map(m => ({
      role: m.role,
      content: m.role === 'assistant' && m.agent_name
        ? `[${m.agent_name}]: ${m.content}`
        : m.content,
    }));
  };

  const callAgent = async (
    content: string,
    agentMeta: AgentMeta,
    history: Array<{ role: string; content: string; agent_name?: string }>,
    settings: { api_url: string; api_key: string | null },
    isMultiAgent: boolean,
  ) => {
    const systemPrompt = isMultiAgent
      ? MEETING_PREFIX + agentMeta.system_prompt
      : agentMeta.system_prompt;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.api_key) headers['Authorization'] = `Bearer ${settings.api_key}`;

    const body: Record<string, unknown> = {
      message: content,
      thread_id: threadId,
      user_id: user!.id,
      agent_type: agentMeta.slug,
      system_prompt: systemPrompt,
      temperature: agentMeta.temperature ?? 0.3,
      history,
    };

    // Add optional fields if present
    if (agentMeta.knowledge_base) body.knowledge_base = agentMeta.knowledge_base;
    if (agentMeta.example_responses) body.example_responses = agentMeta.example_responses;
    if (agentMeta.model) body.model = agentMeta.model;
    if (agentMeta.max_tokens) body.max_tokens = agentMeta.max_tokens;
    if (agentMeta.debate_posture) body.debate_posture = agentMeta.debate_posture;

    const response = await fetch(`${settings.api_url}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    const result = await response.json();
    return result.response || result.message || 'Sem resposta do agente.';
  };

  const saveAssistantMessage = async (
    content: string,
    agentMeta: AgentMeta,
    metadata: Record<string, unknown> = {},
  ) => {
    const { data } = await supabase
      .from('ai_messages')
      .insert({
        thread_id: threadId!,
        role: 'assistant',
        content,
        agent_type: agentMeta.slug,
        metadata,
        agent_id: agentMeta.id,
        agent_name: agentMeta.name,
        agent_color: agentMeta.color,
      } as any)
      .select()
      .single();
    return data as unknown as AIMessage | null;
  };

  const sendMessage = async (
    content: string,
    agentType?: string,
    agentMeta?: AgentMeta,
  ) => {
    if (!threadId || !user || !content.trim()) return;
    setSending(true);
    setAgentStatus('pensando');
    if (agentMeta) setRespondingAgent({ name: agentMeta.name, color: agentMeta.color });

    const history = await fetchHistory();

    const { data: userMsg } = await supabase
      .from('ai_messages')
      .insert({ thread_id: threadId, role: 'user', content, agent_type: agentType } as any)
      .select()
      .single();
    if (userMsg) setMessages(prev => [...prev, userMsg as unknown as AIMessage]);

    try {
      const settings = await getSettings();
      if (!settings?.api_url) {
        const errorMsg = 'Configure a URL da API em Configurações do AI Lab.';
        const { data: errMsg } = await supabase
          .from('ai_messages')
          .insert({ thread_id: threadId, role: 'assistant', content: errorMsg, agent_type: agentType } as any)
          .select()
          .single();
        if (errMsg) setMessages(prev => [...prev, errMsg as unknown as AIMessage]);
        return;
      }

      const meta: AgentMeta = agentMeta
        ? { ...agentMeta, slug: agentType || 'default' }
        : { id: '', name: 'Assistente', color: '#F59E0B', system_prompt: '', slug: agentType || 'default' };

      const assistantContent = await callAgent(content, meta, history, settings, false);
      const msg = await saveAssistantMessage(assistantContent, meta);
      if (msg) setMessages(prev => [...prev, msg]);

      await supabase
        .from('ai_threads')
        .update({ last_message_at: new Date().toISOString(), message_count: messages.length + 2 })
        .eq('thread_id', threadId);
    } catch (err: any) {
      const errorContent = `Erro ao contactar o agente: ${err.message}`;
      const { data: errMsg } = await supabase
        .from('ai_messages')
        .insert({ thread_id: threadId, role: 'assistant', content: errorContent, agent_type: agentType } as any)
        .select()
        .single();
      if (errMsg) setMessages(prev => [...prev, errMsg as unknown as AIMessage]);
    } finally {
      setSending(false);
      setAgentStatus(null);
      setRespondingAgent(null);
    }
  };

  const sendRound = async (content: string, agents: AgentMeta[]) => {
    if (!threadId || !user || !content.trim() || agents.length === 0) return;
    setSending(true);

    const { data: userMsg } = await supabase
      .from('ai_messages')
      .insert({ thread_id: threadId, role: 'user', content } as any)
      .select()
      .single();
    if (userMsg) setMessages(prev => [...prev, userMsg as unknown as AIMessage]);

    const settings = await getSettings();
    if (!settings?.api_url) {
      const errorMsg = 'Configure a URL da API em Configurações do AI Lab.';
      const { data: errMsg } = await supabase
        .from('ai_messages')
        .insert({ thread_id: threadId, role: 'assistant', content: errorMsg } as any)
        .select()
        .single();
      if (errMsg) setMessages(prev => [...prev, errMsg as unknown as AIMessage]);
      setSending(false);
      setAgentStatus(null);
      setRespondingAgent(null);
      return;
    }

    const isMultiAgent = agents.length > 1;

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      setAgentStatus('pensando');
      setRespondingAgent({ name: agent.name, color: agent.color });

      try {
        const history = await fetchHistory();
        const assistantContent = await callAgent(content, agent, history, settings, isMultiAgent);
        const msg = await saveAssistantMessage(assistantContent, agent);
        if (msg) setMessages(prev => [...prev, msg]);
      } catch (err: any) {
        const errorContent = `Erro ao contactar ${agent.name}: ${err.message}`;
        const { data: errMsg } = await supabase
          .from('ai_messages')
          .insert({
            thread_id: threadId,
            role: 'assistant',
            content: errorContent,
            agent_type: agent.slug,
            agent_id: agent.id,
            agent_name: agent.name,
            agent_color: agent.color,
          } as any)
          .select()
          .single();
        if (errMsg) setMessages(prev => [...prev, errMsg as unknown as AIMessage]);
      }
    }

    const currentCount = messages.length + 1 + agents.length;
    await supabase
      .from('ai_threads')
      .update({ last_message_at: new Date().toISOString(), message_count: currentCount })
      .eq('thread_id', threadId);

    setSending(false);
    setAgentStatus(null);
    setRespondingAgent(null);
  };

  const toggleFavorite = async (messageId: string, current: boolean) => {
    await supabase.from('ai_messages').update({ is_favorited: !current }).eq('id', messageId);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_favorited: !current } : m));
  };

  return { messages, loading, sending, agentStatus, respondingAgent, sendMessage, sendRound, toggleFavorite, refetch: loadHistory };
}
