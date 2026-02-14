import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAIThreads } from '@/hooks/ai-lab/useAIThreads';
import { useAIAgents } from '@/hooks/ai-lab/useAIAgents';
import { useAISettings } from '@/hooks/ai-lab/useAISettings';
import { StatCard } from '@/components/ai-lab/StatCard';
import { ThreadCard } from '@/components/ai-lab/ThreadCard';
import { ThreadCreateDialog } from '@/components/ai-lab/ThreadCreateDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MessageSquare, BarChart3, Bot, Wifi, WifiOff, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AILabDashboard() {
  const navigate = useNavigate();
  const { threads, stats, loading, createThread, updateThread, deleteThread } = useAIThreads();
  const { agents } = useAIAgents();
  const { settings } = useAISettings();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = threads.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (title: string, description?: string, agentType?: string) => {
    const thread = await createThread(title, description, agentType);
    if (thread) navigate(`/ai-lab/chat/${thread.thread_id}`);
  };

  const handleArchive = async (threadId: string) => {
    await updateThread(threadId, { status: 'archived' });
    toast({ title: 'Thread arquivada' });
  };

  const handleDelete = async (threadId: string) => {
    await deleteThread(threadId);
    toast({ title: 'Thread excluída' });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projetos IA</h1>
            <p className="text-muted-foreground">Gerencie suas conversas com agentes de IA</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Thread
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Threads Ativas" value={stats.activeThreads} icon={MessageSquare} />
          <StatCard title="Total Mensagens" value={stats.totalMessages} icon={BarChart3} />
          <StatCard title="Agentes" value={agents.filter(a => a.is_active).length} icon={Bot} />
          <StatCard
            title="Status API"
            value={settings?.is_connected ? 'Conectado' : 'Desconectado'}
            icon={settings?.is_connected ? Wifi : WifiOff}
            color={settings?.is_connected ? 'text-green-500' : 'text-destructive'}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar threads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-10">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhuma thread encontrada</p>
              <Button variant="outline" className="mt-3" onClick={() => setCreateOpen(true)}>Criar primeira thread</Button>
            </div>
          ) : (
            filtered.map(t => <ThreadCard key={t.id} thread={t} onArchive={handleArchive} onDelete={handleDelete} />)
          )}
        </div>
      </div>

      <ThreadCreateDialog open={createOpen} onOpenChange={setCreateOpen} agents={agents} onSubmit={handleCreate} />
    </Layout>
  );
}
