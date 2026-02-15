import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAIChat } from '@/hooks/ai-lab/useAIChat';
import { useAIThreads } from '@/hooks/ai-lab/useAIThreads';
import { useAIAgents, type AIAgent } from '@/hooks/ai-lab/useAIAgents';
import { ChatMessage } from '@/components/ai-lab/ChatMessage';
import { ChatInput } from '@/components/ai-lab/ChatInput';
import { AgentStatusBanner } from '@/components/ai-lab/AgentStatusBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bot } from 'lucide-react';
import { AGENT_ICONS } from '@/lib/agent-icons';
import { supabase } from '@/integrations/supabase/client';

function buildAgentMeta(agent: AIAgent) {
  return {
    id: agent.id,
    name: agent.name,
    color: agent.color,
    system_prompt: agent.system_prompt,
    slug: agent.slug,
    temperature: agent.temperature,
    max_tokens: agent.max_tokens,
    knowledge_base: agent.knowledge_base,
    example_responses: agent.example_responses,
    model: agent.model,
    debate_posture: agent.debate_posture,
    max_response_length: agent.max_response_length,
  };
}

export default function AILabChat() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { messages, loading, sending, agentStatus, respondingAgent, sendMessage, sendRound, toggleFavorite } = useAIChat(threadId);
  const { threads } = useAIThreads();
  const { agents } = useAIAgents();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(['default']);
  const initializedRef = useRef(false);

  const thread = threads.find(t => t.thread_id === threadId);

  useEffect(() => {
    if (thread && !initializedRef.current) {
      const stored = (thread as any).active_agents as string[] | undefined;
      if (stored && stored.length > 0) {
        setSelectedSlugs(stored);
      }
      initializedRef.current = true;
    }
  }, [thread]);

  const persistActiveAgents = useCallback(async (slugs: string[]) => {
    if (!threadId) return;
    await supabase
      .from('ai_threads')
      .update({ active_agents: slugs } as any)
      .eq('thread_id', threadId);
  }, [threadId]);

  const toggleAgent = (slug: string) => {
    setSelectedSlugs(prev => {
      let next: string[];
      if (prev.includes(slug)) {
        next = prev.filter(s => s !== slug);
        if (next.length === 0) return prev;
      } else {
        next = [...prev, slug];
      }
      persistActiveAgents(next);
      return next;
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentStatus]);

  const activeAgents = agents.filter(a => a.is_active);
  const selectedAgents = activeAgents.filter(a => selectedSlugs.includes(a.slug));
  const primaryAgent = selectedAgents[0] || activeAgents[0];

  const handleSend = (content: string) => {
    if (!primaryAgent) return;
    sendMessage(content, primaryAgent.slug, buildAgentMeta(primaryAgent));
  };

  const handleSendRound = (content: string) => {
    if (selectedAgents.length === 0) return;
    sendRound(content, selectedAgents.map(buildAgentMeta));
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border mb-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ai-lab')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{thread?.title || 'Chat'}</h2>
            {thread?.description && <p className="text-xs text-muted-foreground truncate">{thread.description}</p>}
          </div>
          {thread && <Badge variant="outline">{thread.agent_type}</Badge>}
        </div>

        {/* Agent Selector */}
        {activeAgents.length > 0 && (
          <div className="flex gap-2 py-3 overflow-x-auto">
            {activeAgents.map(agent => {
              const Icon = AGENT_ICONS[agent.icon] || Bot;
              const isSelected = selectedSlugs.includes(agent.slug);
              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.slug)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border"
                  style={isSelected
                    ? { backgroundColor: agent.color, color: '#fff', borderColor: agent.color }
                    : { backgroundColor: 'transparent', color: agent.color, borderColor: agent.color }
                  }
                >
                  <Icon className="h-4 w-4" />
                  {agent.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-10">Carregando histórico...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Inicie a conversa enviando uma mensagem</p>
          ) : (
            messages.map(m => (
              <ChatMessage key={m.id} message={m} onToggleFavorite={toggleFavorite} />
            ))
          )}
        </div>

        {agentStatus && (
          <AgentStatusBanner
            agentName={respondingAgent?.name}
            agentColor={respondingAgent?.color}
          />
        )}

        <ChatInput
          onSend={handleSend}
          onSendRound={handleSendRound}
          showRoundButton={selectedSlugs.length > 1}
          disabled={sending}
        />
      </div>
    </Layout>
  );
}
