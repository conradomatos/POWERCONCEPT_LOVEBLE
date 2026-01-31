import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useDashboardData, Periodo } from '@/hooks/useDashboardData';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { ProjetosCard } from '@/components/dashboard/ProjetosCard';
import { FinancialKPIs } from '@/components/dashboard/FinancialKPIs';
import { AcoesPendentes } from '@/components/dashboard/AcoesPendentes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, hasAnyRole } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  
  const { alertas, projetos, financeiro, pendencias, isLoading, refetchAll } = useDashboardData(periodo);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!hasAnyRole()) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Pendente</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Sua conta foi criada, mas você ainda não tem permissão para acessar o sistema.
            Entre em contato com um administrador para liberar seu acesso.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Visão gerencial de projetos</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Semana</SelectItem>
                <SelectItem value="mes">Mês</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={refetchAll}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Bloco 1: Alertas Críticos - Only if there are alerts */}
        <AlertBanner 
          alertas={alertas.data || []} 
          isLoading={alertas.isLoading} 
        />

        {/* Bloco 2: KPIs Financeiros */}
        <FinancialKPIs
          receita={financeiro.data?.valores.faturado || 0}
          custo={financeiro.data?.valores.custoMO || 0}
          isLoading={financeiro.isLoading}
        />

        {/* Bloco 3: Tabela de Projetos */}
        <div className="grid gap-6 lg:grid-cols-3">
          <ProjetosCard
            contadores={projetos.data?.contadores || { ativos: 0, emDia: 0, emAlerta: 0, critico: 0 }}
            projetos={projetos.data?.projetos || []}
            isLoading={projetos.isLoading}
          />
        </div>

        {/* Bloco 4: Ações Pendentes */}
        <AcoesPendentes
          pendencias={pendencias.data || []}
          isLoading={pendencias.isLoading}
        />
      </div>
    </Layout>
  );
}
