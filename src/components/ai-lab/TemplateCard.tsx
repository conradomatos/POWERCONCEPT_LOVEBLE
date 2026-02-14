import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Pencil, Trash2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { AITemplate } from '@/hooks/ai-lab/useAITemplates';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: AITemplate;
  onEdit: (t: AITemplate) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
}

const categoryLabels: Record<string, string> = {
  general: 'Geral', custos: 'Custos', relatorios: 'Relatórios', auditoria: 'Auditoria', cronograma: 'Cronograma',
};

export function TemplateCard({ template, onEdit, onDelete, onToggleFavorite }: TemplateCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{template.title}</h3>
              <Badge variant="outline">{categoryLabels[template.category] || template.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{template.content}</p>
            <p className="text-xs text-muted-foreground mt-2">Usado {template.usage_count}x</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleFavorite(template.id, template.is_favorite)}>
              <Star className={cn('h-4 w-4', template.is_favorite && 'fill-yellow-500 text-yellow-500')} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(template.content); toast({ title: 'Copiado!' }); }}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(template)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(template.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
