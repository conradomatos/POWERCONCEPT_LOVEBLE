import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AIAgent } from '@/hooks/ai-lab/useAIAgents';

interface AgentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AIAgent | null;
  onSubmit: (data: { name: string; slug: string; description: string; avatar_icon: string; avatar_color: string }) => Promise<void>;
}

export function AgentCreateDialog({ open, onOpenChange, agent, onSubmit }: AgentCreateDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [avatarIcon, setAvatarIcon] = useState('Bot');
  const [avatarColor, setAvatarColor] = useState('#3b82f6');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setSlug(agent.slug);
      setDescription(agent.description || '');
      setAvatarIcon(agent.avatar_icon);
      setAvatarColor(agent.avatar_color);
    } else {
      setName(''); setSlug(''); setDescription(''); setAvatarIcon('Bot'); setAvatarColor('#3b82f6');
    }
  }, [agent, open]);

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true);
    await onSubmit({ name, slug, description, avatar_icon: avatarIcon, avatar_color: avatarColor });
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{agent ? 'Editar Agente' : 'Novo Agente'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Slug *</Label><Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="ex: analyst" /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Ícone</Label><Input value={avatarIcon} onChange={e => setAvatarIcon(e.target.value)} placeholder="Bot, HardHat, Shield" /></div>
            <div><Label>Cor</Label><Input type="color" value={avatarColor} onChange={e => setAvatarColor(e.target.value)} /></div>
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
