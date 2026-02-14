import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2, Archive, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AIThread } from '@/hooks/ai-lab/useAIThreads';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ThreadCardProps {
  thread: AIThread;
  onArchive: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/15 text-green-500 border-green-500/30',
  paused: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  archived: 'bg-muted text-muted-foreground',
};

const agentColors: Record<string, string> = {
  default: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  engineer: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  auditor: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function ThreadCard({ thread, onArchive, onDelete }: ThreadCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/ai-lab/chat/${thread.thread_id}`)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{thread.title}</h3>
              <Badge variant="outline" className={statusColors[thread.status] || ''}>
                {thread.status}
              </Badge>
              <Badge variant="outline" className={agentColors[thread.agent_type] || agentColors.default}>
                {thread.agent_type}
              </Badge>
            </div>
            {thread.description && (
              <p className="text-sm text-muted-foreground truncate">{thread.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> {thread.message_count} msgs
              </span>
              {thread.last_message_at && (
                <span>{format(new Date(thread.last_message_at), "dd/MM HH:mm", { locale: ptBR })}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/ai-lab/chat/${thread.thread_id}`)}>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onArchive(thread.thread_id)}>
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(thread.thread_id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
