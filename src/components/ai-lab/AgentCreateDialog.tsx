import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AGENT_ICON_OPTIONS, AGENT_ICONS } from '@/lib/agent-icons';
import { Bot } from 'lucide-react';
import type { AIAgent } from '@/hooks/ai-lab/useAIAgents';

interface AgentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AIAgent | null;
  onSubmit: (data: { name: string; slug: string; description: string; icon: string; color: string; system_prompt: string }) => Promise<void>;
}

export function AgentCreateDialog({ open, onOpenChange, agent, onSubmit }: AgentCreateDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('bot');
  const [color, setColor] = useState('#F59E0B');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setSlug(agent.slug);
      setDescription(agent.description || '');
      setIcon(agent.icon);
      setColor(agent.color);
      setSystemPrompt(agent.system_prompt || '');
    } else {
      setName(''); setSlug(''); setDescription(''); setIcon('bot'); setColor('#F59E0B'); setSystemPrompt('');
    }
  }, [agent, open]);

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true);
    await onSubmit({ name, slug, description, icon, color, system_prompt: systemPrompt });
    setSubmitting(false);
    onOpenChange(false);
  };

  const SelectedIcon = AGENT_ICONS[icon] || Bot;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{agent ? 'Editar Agente' : 'Novo Agente'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Slug *</Label><Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="ex: analyst" /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <div><Label>System Prompt *</Label><Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={5} placeholder="Instruções de comportamento do agente..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ícone</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <SelectedIcon className="h-4 w-4" />
                      {AGENT_ICON_OPTIONS.find(o => o.value === icon)?.label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AGENT_ICON_OPTIONS.map(opt => {
                    const OptIcon = AGENT_ICONS[opt.value] || Bot;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2"><OptIcon className="h-4 w-4" />{opt.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Cor</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !slug.trim() || submitting}>{agent ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
