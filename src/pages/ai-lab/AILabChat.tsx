import { useEffect, useRef, useState } from 'react';
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

export default function AILabChat() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { messages, loading, sending, agentStatus, sendMessage, toggleFavorite } = useAIChat(threadId);
  const { threads } = useAIThreads();
  const { agents } = useAIAgents();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedAgentSlug, setSelectedAgentSlug] = useState('default');

  const thread = threads.find(t => t.thread_id === threadId);
  const selectedAgent = agents.find(a => a.slug === selectedAgentSlug) || agents[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentStatus]);

  const handleSend = (content: string) => {
    if (!selectedAgent) return;
    sendMessage(content, selectedAgent.slug, {
      id: selectedAgent.id,
      name: selectedAgent.name,
      color: selectedAgent.color,
      system_prompt: selectedAgent.system_prompt,
    });
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
        {agents.length > 0 && (
          <div className="flex gap-2 py-3 overflow-x-auto">
            {agents.filter(a => a.is_active).map(agent => {
              const Icon = AGENT_ICONS[agent.icon] || Bot;
              const isSelected = agent.slug === selectedAgentSlug;
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentSlug(agent.slug)}
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

        {/* Status Banner */}
        {agentStatus && <AgentStatusBanner agentType={selectedAgent?.slug} />}

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={sending} />
      </div>
    </Layout>
  );
}
