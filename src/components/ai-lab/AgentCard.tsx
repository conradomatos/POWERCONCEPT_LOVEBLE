import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Bot, Copy } from 'lucide-react';
import { AGENT_ICONS } from '@/lib/agent-icons';
import type { AIAgent } from '@/hooks/ai-lab/useAIAgents';

const POSTURE_LABELS: Record<string, string> = {
  aggressive: '🔥 Agressivo',
  critical: '🔍 Crítico',
  neutral: '⚖️ Neutro',
  collaborative: '🤝 Colaborativo',
};

interface AgentCardProps {
  agent: AIAgent;
  isAdmin: boolean;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (agent: AIAgent) => void;
  onDelete: (id: string) => void;
  onDuplicate: (agent: AIAgent) => void;
}

export function AgentCard({ agent, isAdmin, onToggle, onEdit, onDelete, onDuplicate }: AgentCardProps) {
  const Icon = AGENT_ICONS[agent.icon] || Bot;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg shrink-0" style={{ backgroundColor: agent.color + '20', color: agent.color }}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">{agent.name}</h3>
              <Badge variant="outline" className="text-xs">{agent.slug}</Badge>
              <Badge variant={agent.is_active ? 'default' : 'secondary'} className="text-xs">
                {agent.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{agent.description || 'Sem descrição'}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {agent.tags?.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
              <Badge variant="secondary" className="text-xs">{agent.model || 'gpt-4o'}</Badge>
              <Badge variant="secondary" className="text-xs">T: {(agent.temperature ?? 0.3).toFixed(1)}</Badge>
              <Badge variant="secondary" className="text-xs">
                {POSTURE_LABELS[agent.debate_posture] || agent.debate_posture}
              </Badge>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={agent.is_active} onCheckedChange={v => onToggle(agent.id, v)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(agent)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(agent)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(agent.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
