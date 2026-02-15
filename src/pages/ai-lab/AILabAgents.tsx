import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAIAgents } from '@/hooks/ai-lab/useAIAgents';
import { AgentCard } from '@/components/ai-lab/AgentCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function AILabAgents() {
  const { agents, loading, updateAgent, deleteAgent } = useAIAgents();
  const { hasRole, isSuperAdmin } = useAuth();
  const isAdmin = hasRole('admin') || isSuperAdmin();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agentes</h1>
            <p className="text-muted-foreground">Gerencie os agentes de IA disponíveis</p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate('/ai-lab/agents/new')}>
              <Plus className="h-4 w-4 mr-2" /> Novo Agente
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-10">Carregando...</p>
          ) : (
            agents.map(a => (
              <AgentCard
                key={a.id}
                agent={a}
                isAdmin={isAdmin}
                onToggle={(id, active) => updateAgent(id, { is_active: active })}
                onEdit={(agent) => navigate(`/ai-lab/agents/${agent.id}/edit`)}
                onDelete={async (id) => { await deleteAgent(id); toast({ title: 'Agente excluído' }); }}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
