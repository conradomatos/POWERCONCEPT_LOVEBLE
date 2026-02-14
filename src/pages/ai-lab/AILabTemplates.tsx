import { useState } from 'react';
import Layout from '@/components/Layout';
import { useAITemplates, type AITemplate } from '@/hooks/ai-lab/useAITemplates';
import { TemplateCard } from '@/components/ai-lab/TemplateCard';
import { TemplateCreateDialog } from '@/components/ai-lab/TemplateCreateDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AILabTemplates() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, toggleFavorite } = useAITemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<AITemplate | null>(null);
  const [search, setSearch] = useState('');

  const filtered = templates.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (data: { title: string; content: string; category: string; agent_type: string | null }) => {
    if (editTemplate) {
      await updateTemplate(editTemplate.id, data);
      toast({ title: 'Template atualizado' });
    } else {
      await createTemplate(data);
      toast({ title: 'Template criado' });
    }
    setEditTemplate(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Templates de Prompts</h1>
            <p className="text-muted-foreground">Biblioteca de prompts reutilizáveis</p>
          </div>
          <Button onClick={() => { setEditTemplate(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Template
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-10">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Nenhum template encontrado</p>
          ) : (
            filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={(tpl) => { setEditTemplate(tpl); setDialogOpen(true); }}
                onDelete={async (id) => { await deleteTemplate(id); toast({ title: 'Template excluído' }); }}
                onToggleFavorite={toggleFavorite}
              />
            ))
          )}
        </div>
      </div>

      <TemplateCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} template={editTemplate} onSubmit={handleSubmit} />
    </Layout>
  );
}
