import { Copy, Star, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { toast } from '@/hooks/use-toast';
import type { AIMessage } from '@/hooks/ai-lab/useAIChat';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: AIMessage;
  onToggleFavorite: (id: string, current: boolean) => void;
}

export function ChatMessage({ message, onToggleFavorite }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({ title: 'Copiado!' });
  };

  const agentName = !isUser ? (message.agent_name || 'Assistente') : null;
  const agentColor = !isUser ? (message.agent_color || undefined) : undefined;

  return (
    <div className={cn('group flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : '')}>
      <div
        className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center', isUser ? 'bg-primary' : 'bg-muted')}
        style={agentColor ? { backgroundColor: agentColor + '20', color: agentColor } : undefined}
      >
        {isUser ? <User className="h-4 w-4 text-primary-foreground" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('max-w-[80%] rounded-lg px-4 py-2', isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border')}>
        {!isUser && agentName && (
          <div className="flex items-center gap-1.5 mb-1">
            {agentColor && <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: agentColor }} />}
            <span className="text-xs font-medium" style={agentColor ? { color: agentColor } : undefined}>{agentName}</span>
          </div>
        )}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
        <div className={cn('flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity', isUser ? 'justify-start' : 'justify-end')}>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            <Copy className="h-3 w-3" />
          </Button>
          {!isUser && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggleFavorite(message.id, message.is_favorited)}>
              <Star className={cn('h-3 w-3', message.is_favorited && 'fill-yellow-500 text-yellow-500')} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
