import { useState } from 'react';
import Layout from '@/components/Layout';
import { useAIAgents, type AIAgent } from '@/hooks/ai-lab/useAIAgents';
import { AgentCard } from '@/components/ai-lab/AgentCard';
import { AgentCreateDialog } from '@/components/ai-lab/AgentCreateDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AILabAgents() {
  const { agents, loading, createAgent, updateAgent, deleteAgent } = useAIAgents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<AIAgent | null>(null);

  const handleSubmit = async (data: { name: string; slug: string; description: string; avatar_icon: string; avatar_color: string }) => {
    if (editAgent) {
      await updateAgent(editAgent.id, data);
      toast({ title: 'Agente atualizado' });
    } else {
      await createAgent(data);
      toast({ title: 'Agente criado' });
    }
    setEditAgent(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agentes</h1>
            <p className="text-muted-foreground">Gerencie os agentes de IA disponíveis</p>
          </div>
          <Button onClick={() => { setEditAgent(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Agente
          </Button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-10">Carregando...</p>
          ) : (
            agents.map(a => (
              <AgentCard
                key={a.id}
                agent={a}
                onToggle={(id, active) => updateAgent(id, { is_active: active })}
                onEdit={(agent) => { setEditAgent(agent); setDialogOpen(true); }}
                onDelete={async (id) => { await deleteAgent(id); toast({ title: 'Agente excluído' }); }}
              />
            ))
          )}
        </div>
      </div>

      <AgentCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={editAgent}
        onSubmit={handleSubmit}
      />
    </Layout>
  );
}
