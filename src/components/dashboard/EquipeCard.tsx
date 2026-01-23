import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, AlertTriangle, UserX, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColaboradorAtencao {
  id: string;
  nome: string;
  tipo: 'sem_alocacao' | 'conflito';
}

interface EquipeCardProps {
  contadores: {
    ativos: number;
    alocados: number;
    disponiveis: number;
    sobrecarregados: number;
  };
  ocupacaoPct: number;
  listaAtencao: ColaboradorAtencao[];
  isLoading?: boolean;
}

function getOcupacaoColor(pct: number): string {
  if (pct < 85) return 'bg-emerald-500';
  if (pct <= 100) return 'bg-amber-500';
  return 'bg-destructive';
}

function getOcupacaoTextColor(pct: number): string {
  if (pct < 85) return 'text-emerald-600 dark:text-emerald-400';
  if (pct <= 100) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

export function EquipeCard({ contadores, ocupacaoPct, listaAtencao, isLoading }: EquipeCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
            <div className="h-6 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Equipe
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
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{contadores.alocados}</div>
            <div className="text-xs text-muted-foreground">Alocados</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{contadores.disponiveis}</div>
            <div className="text-xs text-muted-foreground">Disponíveis</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{contadores.sobrecarregados}</div>
            <div className="text-xs text-muted-foreground">Sobrecarreg.</div>
          </div>
        </div>

        {/* Barra de Ocupação */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ocupação</span>
            <span className={cn("font-medium", getOcupacaoTextColor(ocupacaoPct))}>
              {ocupacaoPct}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn("h-full transition-all", getOcupacaoColor(ocupacaoPct))}
              style={{ width: `${Math.min(100, ocupacaoPct)}%` }}
            />
          </div>
        </div>

        {/* Lista de Atenção */}
        {listaAtencao.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Lista de Atenção
            </h4>
            <div className="space-y-1.5">
              {listaAtencao.map((colab) => (
                <div 
                  key={colab.id}
                  className={cn(
                    "flex items-center justify-between text-sm px-3 py-2 rounded-md",
                    colab.tipo === 'conflito' 
                      ? "bg-destructive/10 text-destructive" 
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <UserX className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{colab.nome}</span>
                  </div>
                  <span className="text-xs whitespace-nowrap">
                    {colab.tipo === 'conflito' ? 'Conflito' : 'Sem alocação'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            ✓ Nenhum alerta de equipe
          </div>
        )}

        {/* Botão */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/planejamento')}
        >
          Ver planejamento
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
