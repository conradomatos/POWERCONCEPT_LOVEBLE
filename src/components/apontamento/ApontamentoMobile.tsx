import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApontamentoSimplificado, useMyColaborador } from '@/hooks/useApontamentoSimplificado';
import { ProjetoCard } from './ProjetoCard';
import { cn } from '@/lib/utils';

export function ApontamentoMobile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get logged-in user's collaborator record
  const { data: meuColaborador, isLoading: isLoadingColaborador } = useMyColaborador(user?.id);

  const dataStr = format(selectedDate, 'yyyy-MM-dd');
  const {
    projetosComHoras,
    totalHoras,
    isLoading,
    hasChanges,
    setHoras,
    setDescricao,
    saveBatch,
    isProjectSaved,
  } = useApontamentoSimplificado(meuColaborador?.id || null, dataStr);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSave = () => {
    if (meuColaborador?.id) {
      saveBatch.mutate([meuColaborador.id]);
    }
  };

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));

  // Separate real projects from overhead
  const projetosReais = projetosComHoras.filter(p => !p.is_sistema);
  const projetosOverhead = projetosComHoras.filter(p => p.is_sistema);

  if (authLoading || isLoadingColaborador) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meuColaborador) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Seu usuário não está vinculado a um colaborador.
          </p>
          <p className="text-sm text-muted-foreground">
            Entre em contato com o RH para configurar seu acesso.
          </p>
          <Button variant="outline" onClick={() => navigate('/')} className="mt-6">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Apontamento</h1>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center min-w-[180px]">
            <p className="font-medium">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="p-4">
          <p className="text-muted-foreground text-sm mb-4">
            Hoje você trabalhou em:
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Real Projects */}
              {projetosReais.map(projeto => (
                <ProjetoCard
                  key={projeto.projeto_id}
                  projetoId={projeto.projeto_id}
                  projetoOs={projeto.projeto_os}
                  projetoNome={projeto.projeto_nome}
                  isSistema={projeto.is_sistema}
                  horas={projeto.horas}
                  descricao={projeto.descricao}
                  isSaved={isProjectSaved(projeto.projeto_id)}
                  onHorasChange={(h) => setHoras(projeto.projeto_id, h)}
                  onDescricaoChange={(d) => setDescricao(projeto.projeto_id, d)}
                />
              ))}

              {/* Overhead Projects (if any) */}
              {projetosOverhead.length > 0 && (
                <>
                  <div className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Overhead / Administrativo
                    </p>
                  </div>
                  {projetosOverhead.map(projeto => (
                    <ProjetoCard
                      key={projeto.projeto_id}
                      projetoId={projeto.projeto_id}
                      projetoOs={projeto.projeto_os}
                      projetoNome={projeto.projeto_nome}
                      isSistema={projeto.is_sistema}
                      horas={projeto.horas}
                      descricao={projeto.descricao}
                      isSaved={isProjectSaved(projeto.projeto_id)}
                      onHorasChange={(h) => setHoras(projeto.projeto_id, h)}
                      onDescricaoChange={(d) => setDescricao(projeto.projeto_id, d)}
                    />
                  ))}
                </>
              )}

              {projetosComHoras.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nenhum projeto ativo encontrado.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between px-2">
          <span className="text-muted-foreground">Total do dia</span>
          <span className={cn(
            'text-xl font-bold',
            totalHoras > 0 ? 'text-primary' : 'text-muted-foreground'
          )}>
            {totalHoras}h
          </span>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveBatch.isPending}
          className="w-full h-14 text-lg font-semibold gap-2"
          size="lg"
        >
          {saveBatch.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Salvar
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
