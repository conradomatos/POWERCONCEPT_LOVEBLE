import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Bot } from 'lucide-react';
import { AGENT_ICONS } from '@/lib/agent-icons';
import type { AIAgent } from '@/hooks/ai-lab/useAIAgents';

interface AgentCardProps {
  agent: AIAgent;
  isAdmin: boolean;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (agent: AIAgent) => void;
  onDelete: (id: string) => void;
}

export function AgentCard({ agent, isAdmin, onToggle, onEdit, onDelete }: AgentCardProps) {
  const Icon = AGENT_ICONS[agent.icon] || Bot;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: agent.color + '20', color: agent.color }}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{agent.name}</h3>
              <Badge variant="outline">{agent.slug}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{agent.description || 'Sem descrição'}</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Switch checked={agent.is_active} onCheckedChange={v => onToggle(agent.id, v)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(agent)}>
                <Pencil className="h-4 w-4" />
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
