import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAIChat } from '@/hooks/ai-lab/useAIChat';
import { useAIThreads } from '@/hooks/ai-lab/useAIThreads';
import { ChatMessage } from '@/components/ai-lab/ChatMessage';
import { ChatInput } from '@/components/ai-lab/ChatInput';
import { AgentStatusBanner } from '@/components/ai-lab/AgentStatusBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AILabChat() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { messages, loading, sending, agentStatus, sendMessage, toggleFavorite } = useAIChat(threadId);
  const { threads } = useAIThreads();
  const scrollRef = useRef<HTMLDivElement>(null);

  const thread = threads.find(t => t.thread_id === threadId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentStatus]);

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
        {agentStatus && <AgentStatusBanner agentType={thread?.agent_type} />}

        {/* Input */}
        <ChatInput onSend={(msg) => sendMessage(msg, thread?.agent_type)} disabled={sending} />
      </div>
    </Layout>
  );
}
