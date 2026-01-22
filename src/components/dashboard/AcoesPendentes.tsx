import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListTodo, ArrowRight, FileWarning, CheckSquare, Users, RefreshCw, DollarSign, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Pendencia {
  tipo: string;
  quantidade: number;
  prioridade: 'vermelho' | 'amarelo';
  label: string;
  link: string;
}

interface AcoesPendentesProps {
  pendencias: Pendencia[];
  isLoading?: boolean;
}

const pendenciaIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  apontamentos: FileWarning,
  aprovacoes: CheckSquare,
  custos: Users,
  omie: RefreshCw,
  margem: TrendingDown,
  titulos: DollarSign,
};

export function AcoesPendentes({ pendencias, isLoading }: AcoesPendentesProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5" />
            Ações Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendencias.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5" />
            Ações Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 text-emerald-500/50" />
            <p>Nenhuma ação pendente</p>
            <p className="text-sm">Tudo em dia! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListTodo className="h-5 w-5" />
          Ações Pendentes
          <Badge variant="secondary" className="ml-2">
            {pendencias.reduce((acc, p) => acc + p.quantidade, 0)} itens
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pendencias.map((pendencia, index) => {
            const Icon = pendenciaIcons[pendencia.tipo] || FileWarning;
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  pendencia.prioridade === 'vermelho'
                    ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                    : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    pendencia.prioridade === 'vermelho'
                      ? "bg-destructive/20 text-destructive"
                      : "bg-amber-500/20 text-amber-500"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{pendencia.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {pendencia.quantidade} {pendencia.quantidade === 1 ? 'item' : 'itens'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(pendencia.link)}
                  className={cn(
                    pendencia.prioridade === 'vermelho'
                      ? "text-destructive hover:text-destructive hover:bg-destructive/20"
                      : "text-amber-600 hover:text-amber-600 hover:bg-amber-500/20"
                  )}
                >
                  Resolver
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
