import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AITemplate } from '@/hooks/ai-lab/useAITemplates';

interface TemplateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AITemplate | null;
  onSubmit: (data: { title: string; content: string; category: string; agent_type: string | null }) => Promise<void>;
}

const CATEGORIES = [
  { value: 'general', label: 'Geral' },
  { value: 'custos', label: 'Custos' },
  { value: 'relatorios', label: 'Relatórios' },
  { value: 'auditoria', label: 'Auditoria' },
  { value: 'cronograma', label: 'Cronograma' },
];

export function TemplateCreateDialog({ open, onOpenChange, template, onSubmit }: TemplateCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setContent(template.content);
      setCategory(template.category);
    } else {
      setTitle(''); setContent(''); setCategory('general');
    }
  }, [template, open]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    await onSubmit({ title, content, category, agent_type: null });
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{template ? 'Editar Template' : 'Novo Template'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Conteúdo *</Label><Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Use {variavel} para placeholders" /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim() || submitting}>{template ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
