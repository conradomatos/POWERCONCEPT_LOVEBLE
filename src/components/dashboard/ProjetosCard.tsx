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
  dias_restantes: number;
  progresso: number;
  status_visual: 'ok' | 'alerta' | 'critico';
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

function getPrazoColor(dias: number) {
  if (dias > 15) return 'text-emerald-500';
  if (dias >= 5) return 'text-amber-500';
  return 'text-destructive';
}

function getPrazoBadgeVariant(dias: number): "default" | "secondary" | "destructive" | "outline" {
  if (dias > 15) return 'secondary';
  if (dias >= 5) return 'outline';
  return 'destructive';
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

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderKanban className="h-5 w-5" />
          Projetos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contadores */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{contadores.ativos}</div>
            <div className="text-xs text-muted-foreground">Ativos</div>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-500">{contadores.emDia}</div>
            <div className="text-xs text-muted-foreground">Em Dia</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-500">{contadores.emAlerta}</div>
            <div className="text-xs text-muted-foreground">Alerta</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{contadores.critico}</div>
            <div className="text-xs text-muted-foreground">Crítico</div>
          </div>
        </div>

        {/* Mini-tabela */}
        {projetos.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Projeto</TableHead>
                  <TableHead className="w-[120px]">Cliente</TableHead>
                  <TableHead className="w-[100px]">Progresso</TableHead>
                  <TableHead className="w-[80px] text-right">Margem</TableHead>
                  <TableHead className="w-[80px] text-right">Prazo</TableHead>
                  <TableHead className="w-[50px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projetos.map((projeto) => {
                  const StatusIcon = statusIcons[projeto.status_visual];
                  return (
                    <TableRow 
                      key={projeto.projeto_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/rentabilidade/${projeto.projeto_id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="truncate max-w-[160px]" title={projeto.projeto_nome}>
                          {projeto.projeto_nome}
                        </div>
                        <div className="text-xs text-muted-foreground">{projeto.projeto_os}</div>
                      </TableCell>
                      <TableCell>
                        <div className="truncate max-w-[100px]" title={projeto.cliente_nome}>
                          {projeto.cliente_nome || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={projeto.progresso} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8">
                            {Math.round(projeto.progresso)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-medium", getMargemColor(projeto.margem_competencia_pct))}>
                          {projeto.margem_competencia_pct !== null 
                            ? `${projeto.margem_competencia_pct.toFixed(1)}%` 
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={getPrazoBadgeVariant(projeto.dias_restantes)}
                          className={cn("text-xs", getPrazoColor(projeto.dias_restantes))}
                        >
                          {projeto.dias_restantes >= 0 ? `${projeto.dias_restantes}d` : 'Vencido'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusIcon className={cn("h-5 w-5 mx-auto", statusColors[projeto.status_visual])} />
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
