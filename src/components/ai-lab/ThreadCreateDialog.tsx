import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AIAgent } from '@/hooks/ai-lab/useAIAgents';

interface ThreadCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AIAgent[];
  onSubmit: (title: string, description?: string, agentType?: string) => Promise<void>;
}

export function ThreadCreateDialog({ open, onOpenChange, agents, onSubmit }: ThreadCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState('default');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit(title, description || undefined, agentType);
    setTitle('');
    setDescription('');
    setAgentType('default');
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Thread</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Análise de Custos - Projeto Aurora" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={2} />
          </div>
          <div>
            <Label>Agente</Label>
            <Select value={agentType} onValueChange={setAgentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {agents.filter(a => a.is_active).map(a => (
                  <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting ? 'Criando...' : 'Criar Thread'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
