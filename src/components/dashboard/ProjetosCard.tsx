import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FolderKanban, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjetoResumo {
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  cliente_nome: string;
  margem_competencia_pct: number | null;
  dias_restantes: number | null;
  progresso: number | null;
  status_visual: 'ok' | 'alerta' | 'critico';
  horas_previstas: number | null;
  horas_totais: number | null;
  desvio_horas_pct: number | null;
  custo_total?: number | null;
}

interface ProjetosCardProps {
  contadores: {
    ativos: number;
    emDia: number;
    emAlerta: number;
    critico: number;
  };
  projetos: ProjetoResumo[];
  isLoading?: boolean;
}

const statusIcons = {
  ok: CheckCircle,
  alerta: AlertTriangle,
  critico: XCircle,
};

const statusColors = {
  ok: 'text-emerald-500',
  alerta: 'text-amber-500',
  critico: 'text-destructive',
};

function getMargemColor(margem: number | null) {
  if (margem === null) return 'text-muted-foreground';
  if (margem >= 20) return 'text-emerald-500';
  if (margem >= 0) return 'text-amber-500';
  return 'text-destructive';
}

function getPrazoBadgeClasses(dias: number | null): string {
  if (dias === null) return 'bg-muted text-muted-foreground border-muted';
  if (dias < 0) return 'bg-destructive/10 text-destructive border-destructive/30';
  if (dias < 5) return 'bg-destructive/10 text-destructive border-destructive/30';
  if (dias <= 15) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
}

function formatPrazo(dias: number | null): string {
  if (dias === null) return '-';
  if (dias < 0) return 'Vencido';
  return `${dias}d`;
}

export function ProjetosCard({ contadores, projetos, isLoading }: ProjetosCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderKanban className="h-5 w-5" />
            Projetos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
            <div className="h-48 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const getMargemIndicator = (margem: number | null) => {
    if (margem === null) return { emoji: '⚪', color: 'text-muted-foreground' };
    if (margem >= 15) return { emoji: '🟢', color: 'text-emerald-500' };
    if (margem >= 5) return { emoji: '🟡', color: 'text-amber-500' };
    return { emoji: '🔴', color: 'text-destructive' };
  };

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderKanban className="h-5 w-5" />
            Projetos Ativos
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{contadores.ativos} ativos</span>
            <span className="text-emerald-500">• {contadores.emDia} ok</span>
            <span className="text-amber-500">• {contadores.emAlerta} alerta</span>
            <span className="text-destructive">• {contadores.critico} crítico</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabela simplificada */}
        {projetos.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Projeto</TableHead>
                  <TableHead className="w-[140px]">Horas</TableHead>
                  <TableHead className="w-[100px] text-right">Custo</TableHead>
                  <TableHead className="w-[80px] text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projetos.map((projeto) => {
                  const margemInfo = getMargemIndicator(projeto.margem_competencia_pct);
                  const horasExec = Math.round(Number(projeto.horas_totais) || 0);
                  const horasPrev = projeto.horas_previstas || 0;
                  const horasProgress = horasPrev > 0 ? Math.min(100, (horasExec / horasPrev) * 100) : 0;
                  
                  return (
                    <TableRow 
                      key={projeto.projeto_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/rentabilidade/${projeto.projeto_id}`)}
                    >
                      <TableCell>
                        <div className="font-medium truncate max-w-[200px]" title={projeto.projeto_nome}>
                          <span className="text-muted-foreground">{projeto.projeto_os}</span>
                          {' - '}
                          {projeto.projeto_nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={horasProgress} className="h-2 flex-1 max-w-[60px]" />
                          <span className={cn(
                            "text-xs font-medium whitespace-nowrap",
                            horasProgress > 100 ? "text-destructive" :
                            horasProgress > 80 ? "text-amber-500" :
                            "text-muted-foreground"
                          )}>
                            {horasExec}/{horasPrev}h
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">
                          {formatCurrency(projeto.custo_total)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-medium", margemInfo.color)}>
                          {margemInfo.emoji} {projeto.margem_competencia_pct !== null 
                            ? `${projeto.margem_competencia_pct.toFixed(0)}%` 
                            : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum projeto ativo encontrado
          </div>
        )}

        {/* Botão Ver Todos */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/projetos')}
        >
          Ver todos os projetos
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
