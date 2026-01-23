import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { ProjetoSelector } from "@/components/rentabilidade/ProjetoSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Link2, AlertTriangle, Check, RefreshCw, Save } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { toast } from "@/hooks/use-toast";

interface CodigoNaoMapeado {
  codigo: number;
  qtdTitulos: number;
  valorTotal: number;
}

export default function MapeamentoOmie() {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasAnyRole, hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  // Estado para armazenar os mapeamentos selecionados
  const [mapeamentos, setMapeamentos] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Buscar códigos do Omie não mapeados
  const { data: codigosNaoMapeados, isLoading: loadingCodigos, refetch: refetchCodigos } = useQuery({
    queryKey: ['codigos-nao-mapeados'],
    queryFn: async () => {
      // Buscar títulos AR sem projeto_id
      const { data: titulosAR, error: errorAR } = await supabase
        .from('omie_contas_receber')
        .select('omie_projeto_codigo, valor')
        .not('omie_projeto_codigo', 'is', null)
        .is('projeto_id', null);
      
      if (errorAR) throw errorAR;

      // Buscar títulos AP sem projeto_id
      const { data: titulosAP, error: errorAP } = await supabase
        .from('omie_contas_pagar')
        .select('omie_projeto_codigo, valor')
        .not('omie_projeto_codigo', 'is', null)
        .is('projeto_id', null);
      
      if (errorAP) throw errorAP;

      // Combinar e agrupar por código
      const todosOsTitulos = [...(titulosAR || []), ...(titulosAP || [])];
      
      const agrupado = todosOsTitulos.reduce<Record<number, CodigoNaoMapeado>>((acc, t) => {
        const codigo = t.omie_projeto_codigo as number;
        if (!acc[codigo]) {
          acc[codigo] = { codigo, qtdTitulos: 0, valorTotal: 0 };
        }
        acc[codigo].qtdTitulos++;
        acc[codigo].valorTotal += Number(t.valor);
        return acc;
      }, {});

      return Object.values(agrupado).sort((a, b) => b.valorTotal - a.valorTotal);
    },
    enabled: !!user && hasAnyRole(),
  });

  // Buscar projetos para mapeamento
  const { data: projetos, isLoading: loadingProjetos } = useQuery({
    queryKey: ['projetos-para-mapeamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, os, nome, omie_codigo')
        .order('nome');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && hasAnyRole(),
  });

  // Mutation para salvar mapeamento individual
  const salvarMapeamentoMutation = useMutation({
    mutationFn: async ({ omieCodigo, projetoId }: { omieCodigo: number; projetoId: string }) => {
      // 1. Atualizar o projeto com o omie_codigo
      const { error: errorProjeto } = await supabase
        .from('projetos')
        .update({ omie_codigo: omieCodigo })
        .eq('id', projetoId);
      
      if (errorProjeto) throw errorProjeto;

      // 2. Atualizar todos os títulos AR com esse código
      const { error: errorAR } = await supabase
        .from('omie_contas_receber')
        .update({ projeto_id: projetoId })
        .eq('omie_projeto_codigo', omieCodigo);
      
      if (errorAR) throw errorAR;

      // 3. Atualizar todos os títulos AP com esse código
      const { error: errorAP } = await supabase
        .from('omie_contas_pagar')
        .update({ projeto_id: projetoId })
        .eq('omie_projeto_codigo', omieCodigo);
      
      if (errorAP) throw errorAP;

      // 4. Resolver pendências relacionadas
      await supabase
        .from('pendencias_financeiras')
        .update({ 
          status: 'RESOLVIDA',
          resolvido_em: new Date().toISOString(),
          resolvido_por: user?.id
        })
        .eq('referencia_omie_codigo', omieCodigo)
        .eq('tipo', 'PROJETO_INEXISTENTE');

      return { omieCodigo, projetoId };
    },
    onSuccess: ({ omieCodigo }) => {
      toast({
        title: "Mapeamento salvo",
        description: `Código ${omieCodigo} vinculado com sucesso.`,
      });
      // Limpar seleção
      setMapeamentos(prev => {
        const novo = { ...prev };
        delete novo[omieCodigo];
        return novo;
      });
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['codigos-nao-mapeados'] });
      queryClient.invalidateQueries({ queryKey: ['projetos-para-mapeamento'] });
      queryClient.invalidateQueries({ queryKey: ['rentabilidade'] });
      queryClient.invalidateQueries({ queryKey: ['pendencias-count'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para salvar todos os mapeamentos de uma vez
  const salvarTodosMutation = useMutation({
    mutationFn: async () => {
      const mapeamentosArray = Object.entries(mapeamentos);
      for (const [codigoStr, projetoId] of mapeamentosArray) {
        const omieCodigo = Number(codigoStr);
        
        // 1. Atualizar projeto
        const { error: errorProjeto } = await supabase
          .from('projetos')
          .update({ omie_codigo: omieCodigo })
          .eq('id', projetoId);
        
        if (errorProjeto) throw errorProjeto;

        // 2. Atualizar títulos AR
        await supabase
          .from('omie_contas_receber')
          .update({ projeto_id: projetoId })
          .eq('omie_projeto_codigo', omieCodigo);

        // 3. Atualizar títulos AP
        await supabase
          .from('omie_contas_pagar')
          .update({ projeto_id: projetoId })
          .eq('omie_projeto_codigo', omieCodigo);

        // 4. Resolver pendências
        await supabase
          .from('pendencias_financeiras')
          .update({ 
            status: 'RESOLVIDA',
            resolvido_em: new Date().toISOString(),
            resolvido_por: user?.id
          })
          .eq('referencia_omie_codigo', omieCodigo)
          .eq('tipo', 'PROJETO_INEXISTENTE');
      }
      return mapeamentosArray.length;
    },
    onSuccess: (qtd) => {
      toast({
        title: "Mapeamentos salvos",
        description: `${qtd} código(s) vinculado(s) com sucesso.`,
      });
      setMapeamentos({});
      queryClient.invalidateQueries({ queryKey: ['codigos-nao-mapeados'] });
      queryClient.invalidateQueries({ queryKey: ['projetos-para-mapeamento'] });
      queryClient.invalidateQueries({ queryKey: ['rentabilidade'] });
      queryClient.invalidateQueries({ queryKey: ['pendencias-count'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProjetoSelecionado = (omieCodigo: number, projetoId: string) => {
    setMapeamentos(prev => ({ ...prev, [omieCodigo]: projetoId }));
  };

  const handleSalvarIndividual = (omieCodigo: number) => {
    const projetoId = mapeamentos[omieCodigo];
    if (projetoId) {
      salvarMapeamentoMutation.mutate({ omieCodigo, projetoId });
    }
  };

  const handleSalvarTodos = () => {
    if (Object.keys(mapeamentos).length > 0) {
      salvarTodosMutation.mutate();
    }
  };

  const qtdMapeamentosPendentes = Object.keys(mapeamentos).length;
  const canEdit = hasRole('admin') || hasRole('financeiro');

  if (authLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px]" />
        </div>
      </Layout>
    );
  }

  if (!hasAnyRole()) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Acesso não autorizado.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/rentabilidade')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Mapeamento Omie</h1>
              <p className="text-muted-foreground text-sm">
                Vincular códigos de projeto do Omie a projetos locais
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchCodigos()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            {qtdMapeamentosPendentes > 0 && canEdit && (
              <Button 
                onClick={handleSalvarTodos}
                disabled={salvarTodosMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Todos ({qtdMapeamentosPendentes})
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Códigos Não Mapeados</CardTitle>
            </div>
            <CardDescription>
              Estes códigos de projeto do Omie aparecem em títulos financeiros mas não estão vinculados a nenhum projeto local.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCodigos || loadingProjetos ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : codigosNaoMapeados && codigosNaoMapeados.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Código Omie</TableHead>
                    <TableHead className="w-[100px] text-center">Títulos</TableHead>
                    <TableHead className="w-[150px] text-right">Valor Total</TableHead>
                    <TableHead>Projeto Local</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codigosNaoMapeados.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {item.codigo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.qtdTitulos}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.valorTotal)}
                      </TableCell>
                      <TableCell>
                        <ProjetoSelector
                          value={mapeamentos[item.codigo] || null}
                          onChange={(projetoId) => handleProjetoSelecionado(item.codigo, projetoId)}
                          projetos={projetos || []}
                          disabled={!canEdit || salvarMapeamentoMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSalvarIndividual(item.codigo)}
                          disabled={
                            !mapeamentos[item.codigo] || 
                            salvarMapeamentoMutation.isPending ||
                            !canEdit
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Salvar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-green-500/10 p-4 mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium">Tudo mapeado!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Não há códigos de projeto do Omie pendentes de mapeamento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium">Como funciona?</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Os códigos listados acima aparecem em títulos do Omie (Contas a Receber e/ou Contas a Pagar)</li>
                  <li>Selecione o projeto local correspondente para cada código</li>
                  <li>Ao salvar, o sistema vinculará automaticamente todos os títulos ao projeto</li>
                  <li>Futuras sincronizações usarão este mapeamento automaticamente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
