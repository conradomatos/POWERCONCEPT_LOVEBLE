import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ProjetoForm from '@/components/ProjetoForm';
import {
  FolderPlus,
  UserPlus,
  Upload,
  Users,
  TrendingUp,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Info,
  Link2,
  Clock,
  Building2,
  FolderKanban,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [projetoFormOpen, setProjetoFormOpen] = useState(false);

  // Fetch pending counts
  const { data: pendingCounts, isLoading: loadingPending } = useQuery({
    queryKey: ['home-pending-counts'],
    queryFn: async () => {
      // Fetch counts from apontamentos_consolidado
      const [naoLancados, comErro, semCusto] = await Promise.all([
        supabase
          .from('apontamentos_consolidado')
          .select('id', { count: 'exact', head: true })
          .eq('status_apontamento', 'NAO_LANCADO'),
        supabase
          .from('apontamentos_consolidado')
          .select('id', { count: 'exact', head: true })
          .eq('status_integracao', 'ERRO'),
        supabase
          .from('custo_projeto_dia')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'SEM_CUSTO'),
      ]);

      return {
        naoLancados: naoLancados.count || 0,
        comErro: comErro.count || 0,
        semCusto: semCusto.count || 0,
      };
    },
  });

  // Fetch Omie integration status
  const { data: omieStatus } = useQuery({
    queryKey: ['home-omie-status'],
    queryFn: async () => {
      const [synced, error, notSent, lastSync] = await Promise.all([
        supabase
          .from('projetos')
          .select('id', { count: 'exact', head: true })
          .eq('omie_sync_status', 'SYNCED'),
        supabase
          .from('projetos')
          .select('id', { count: 'exact', head: true })
          .eq('omie_sync_status', 'ERROR'),
        supabase
          .from('projetos')
          .select('id', { count: 'exact', head: true })
          .or('omie_sync_status.is.null,omie_sync_status.eq.NOT_SENT'),
        supabase
          .from('projetos')
          .select('omie_last_sync_at')
          .not('omie_last_sync_at', 'is', null)
          .order('omie_last_sync_at', { ascending: false })
          .limit(1)
          .single(),
      ]);

      return {
        synced: synced.count || 0,
        error: error.count || 0,
        notSent: notSent.count || 0,
        lastSyncAt: lastSync.data?.omie_last_sync_at || null,
      };
    },
  });

  // Fetch recent projects
  const { data: recentProjects, isLoading: loadingProjects } = useQuery({
    queryKey: ['home-recent-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projetos')
        .select('id, os, nome, empresa_id, empresas(empresa)')
        .order('updated_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Fetch recent clients
  const { data: recentClients, isLoading: loadingClients } = useQuery({
    queryKey: ['home-recent-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('empresas')
        .select('id, codigo, empresa')
        .order('updated_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const handleProjetoCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['home-recent-projects'] });
    queryClient.invalidateQueries({ queryKey: ['projetos'] });
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca sincronizado';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    return `Há ${diffDays} dias`;
  };

  const getOmieStatusInfo = () => {
    if (!omieStatus) return { status: 'loading', label: 'Carregando...', variant: 'outline' as const };
    
    if (omieStatus.synced > 0) {
      if (omieStatus.error > 0) {
        return { 
          status: 'warning', 
          label: `${omieStatus.synced} ok, ${omieStatus.error} erro(s)`, 
          variant: 'outline' as const,
          className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
        };
      }
      return { 
        status: 'ok', 
        label: `${omieStatus.synced} sincronizado(s)`, 
        variant: 'outline' as const,
        className: 'bg-green-500/20 text-green-500 border-green-500/30'
      };
    }
    
    return { status: 'not_configured', label: 'Não configurado', variant: 'outline' as const };
  };

  const quickActions = [
    {
      icon: FolderPlus,
      title: 'Novo Projeto',
      description: 'Criar um novo projeto',
      onClick: () => setProjetoFormOpen(true),
      variant: 'default' as const,
    },
    {
      icon: UserPlus,
      title: 'Novo Cliente',
      description: 'Cadastrar novo cliente',
      onClick: () => navigate('/empresas?new=true'),
      variant: 'outline' as const,
    },
    {
      icon: Upload,
      title: 'Importar Apontamentos',
      description: 'Importar do Secullum',
      onClick: () => navigate('/import-apontamentos'),
      variant: 'outline' as const,
    },
    {
      icon: Users,
      title: 'Importar Colaboradores',
      description: 'Importar via CSV',
      onClick: () => navigate('/import'),
      variant: 'outline' as const,
    },
    {
      icon: TrendingUp,
      title: 'Custos & Margem',
      description: 'Ver relatório de custos',
      onClick: () => navigate('/custos-projeto'),
      variant: 'outline' as const,
    },
  ];

  const pendingCards = [
    {
      icon: AlertTriangle,
      title: 'Não lançados',
      count: pendingCounts?.naoLancados ?? 0,
      description: 'apontamentos pendentes',
      status: 'warning' as const,
      onClick: () => navigate('/apontamentos?status=NAO_LANCADO'),
    },
    {
      icon: XCircle,
      title: 'Com erro',
      count: pendingCounts?.comErro ?? 0,
      description: 'registros com falha',
      status: 'danger' as const,
      onClick: () => navigate('/apontamentos?status=ERRO'),
    },
    {
      icon: AlertCircle,
      title: 'Sem custo',
      count: pendingCounts?.semCusto ?? 0,
      description: 'pendências de custo',
      status: 'warning' as const,
      onClick: () => navigate('/recursos/custos?sem_custo=true'),
    },
    {
      icon: Info,
      title: 'Divergências',
      count: 0,
      description: 'planejado vs real',
      status: 'info' as const,
      onClick: () => navigate('/planejamento'),
    },
  ];

  const getStatusColor = (status: 'warning' | 'danger' | 'info', count: number) => {
    if (count === 0) return 'bg-muted/50 border-muted';
    switch (status) {
      case 'danger':
        return 'bg-destructive/10 border-destructive/50 hover:border-destructive';
      case 'warning':
        return 'bg-primary/10 border-primary/50 hover:border-primary';
      case 'info':
        return 'bg-secondary/20 border-secondary hover:border-secondary/80';
    }
  };

  const getCountColor = (status: 'warning' | 'danger' | 'info', count: number) => {
    if (count === 0) return 'text-muted-foreground';
    switch (status) {
      case 'danger':
        return 'text-destructive';
      case 'warning':
        return 'text-primary';
      case 'info':
        return 'text-secondary-foreground';
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Home</h1>
          <p className="text-muted-foreground">Atalhos, pendências e status do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/import-apontamentos')}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Apontamentos
          </Button>
          <Button onClick={() => setProjetoFormOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Section 1: Quick Actions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                onClick={action.onClick}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 2: Pending Items */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Pendências</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pendingCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className={`cursor-pointer transition-all border-2 ${getStatusColor(card.status, card.count)}`}
                onClick={card.onClick}
              >
                <CardContent className="p-4">
                  {loadingPending ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-1 ${getCountColor(card.status, card.count)}`} />
                      <div className="flex-1">
                        <p className={`text-3xl font-bold ${getCountColor(card.status, card.count)}`}>
                          {card.count}
                        </p>
                        <p className="font-medium text-sm">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.description}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 3: Integration Status */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Integrações</h2>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Omie</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatLastSync(omieStatus?.lastSyncAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getOmieStatusInfo().variant} 
                    className={getOmieStatusInfo().className}
                  >
                    {getOmieStatusInfo().label}
                  </Badge>
                  {omieStatus?.error && omieStatus.error > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/projetos?omie=ERROR')}>
                      Ver erros
                    </Button>
                  )}
                  {getOmieStatusInfo().status === 'not_configured' && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                      Configurar
                    </Button>
                  )}
                </div>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Secullum</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Não configurado
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-muted-foreground">
                    Não configurado
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                    Configurar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 4: Recent Items */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Projetos Recentes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projetos')}>
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentProjects && recentProjects.length > 0 ? (
              <div className="space-y-2">
                {recentProjects.map((project: any) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/projetos`)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {project.os}
                      </Badge>
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {project.nome}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {project.empresas?.empresa}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderKanban className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Nenhum projeto cadastrado</p>
                <Button size="sm" onClick={() => navigate('/projetos?new=true')}>
                  Criar primeiro projeto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Clientes Recentes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/empresas')}>
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingClients ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentClients && recentClients.length > 0 ? (
              <div className="space-y-2">
                {recentClients.map((client: any) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/empresas`)}
                  >
                    <span className="font-medium text-sm truncate max-w-[200px]">
                      {client.empresa}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {client.codigo}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Nenhum cliente cadastrado</p>
                <Button size="sm" onClick={() => navigate('/empresas?new=true')}>
                  Cadastrar primeiro cliente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Projeto Form Modal */}
      <ProjetoForm
        open={projetoFormOpen}
        onOpenChange={setProjetoFormOpen}
        onSuccess={handleProjetoCreated}
      />
    </Layout>
  );
}
