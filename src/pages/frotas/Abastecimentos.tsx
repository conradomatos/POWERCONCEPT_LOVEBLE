import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Fuel, Droplets, DollarSign, Gauge, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AbastecimentoForm from '@/components/frotas/AbastecimentoForm';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';

type Abastecimento = {
  id: string;
  veiculo_id: string;
  colaborador_id: string | null;
  projeto_id: string | null;
  km_atual: number | null;
  litros: number | null;
  valor_total: number | null;
  preco_litro: number | null;
  km_por_litro: number | null;
  tipo_combustivel: string | null;
  posto_nome: string | null;
  posto_cnpj: string | null;
  posto_cidade: string | null;
  chave_nfce: string | null;
  forma_pagamento: string | null;
  ultimos_digitos_cartao: string | null;
  foto_cupom_url: string | null;
  data_abastecimento: string | null;
  conciliado_omie: boolean | null;
  created_at: string;
  veiculos: { placa: string; apelido: string | null } | null;
  collaborators: { full_name: string } | null;
  projetos: { nome: string; os: string } | null;
};

export default function Abastecimentos() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAbastecimento, setSelectedAbastecimento] = useState<Abastecimento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [abastecimentoToDelete, setAbastecimentoToDelete] = useState<Abastecimento | null>(null);

  // Filtros
  const [filtroVeiculo, setFiltroVeiculo] = useState('_todos');
  const [filtroProjeto, setFiltroProjeto] = useState('_todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const canEdit = hasRole('admin') || hasRole('rh');

  const { data: abastecimentos, isLoading } = useQuery({
    queryKey: ['abastecimentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abastecimentos')
        .select(`
          *,
          veiculos:veiculo_id (placa, apelido),
          collaborators:colaborador_id (full_name),
          projetos:projeto_id (nome, os)
        `)
        .order('data_abastecimento', { ascending: false });

      if (error) throw error;
      return data as Abastecimento[];
    },
  });

  const { data: veiculosFilter } = useQuery({
    queryKey: ['veiculos-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, apelido')
        .order('placa');
      if (error) throw error;
      return data;
    },
  });

  const { data: projetosFilter } = useQuery({
    queryKey: ['projetos-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const filteredAbastecimentos = useMemo(() => {
    if (!abastecimentos) return [];
    return abastecimentos.filter((a) => {
      if (filtroVeiculo !== '_todos' && a.veiculo_id !== filtroVeiculo) return false;
      if (filtroProjeto !== '_todos' && a.projeto_id !== filtroProjeto) return false;
      if (filtroDataInicio && a.data_abastecimento) {
        const dataReg = new Date(a.data_abastecimento).toISOString().slice(0, 10);
        if (dataReg < filtroDataInicio) return false;
      }
      if (filtroDataFim && a.data_abastecimento) {
        const dataReg = new Date(a.data_abastecimento).toISOString().slice(0, 10);
        if (dataReg > filtroDataFim) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const matchPlaca = a.veiculos?.placa?.toLowerCase().includes(s);
        const matchPosto = a.posto_nome?.toLowerCase().includes(s);
        if (!matchPlaca && !matchPosto) return false;
      }
      return true;
    });
  }, [abastecimentos, filtroVeiculo, filtroProjeto, filtroDataInicio, filtroDataFim, search]);

  // Cards de resumo calculados sobre os dados filtrados
  const resumo = useMemo(() => {
    const dados = filteredAbastecimentos;
    const totalLitros = dados.reduce((acc, a) => acc + (a.litros || 0), 0);
    const gastoTotal = dados.reduce((acc, a) => acc + (a.valor_total || 0), 0);
    const mediaPrecoLitro = totalLitros > 0 ? gastoTotal / totalLitros : 0;
    const comKmL = dados.filter((a) => a.km_por_litro && a.km_por_litro > 0);
    const mediaKmL = comKmL.length > 0
      ? comKmL.reduce((acc, a) => acc + (a.km_por_litro || 0), 0) / comKmL.length
      : 0;

    return { totalLitros, gastoTotal, mediaPrecoLitro, mediaKmL };
  }, [filteredAbastecimentos]);

  const handleNew = () => {
    setSelectedAbastecimento(null);
    setFormOpen(true);
  };

  const handleEdit = (abastecimento: Abastecimento) => {
    setSelectedAbastecimento(abastecimento);
    setFormOpen(true);
  };

  const confirmDelete = (abastecimento: Abastecimento) => {
    setAbastecimentoToDelete(abastecimento);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!abastecimentoToDelete) return;

    try {
      const { error } = await supabase
        .from('abastecimentos')
        .delete()
        .eq('id', abastecimentoToDelete.id);

      if (error) throw error;
      toast.success('Abastecimento excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['abastecimentos'] });
    } catch (error: any) {
      toast.error('Erro ao excluir abastecimento: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setAbastecimentoToDelete(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (value: number | null, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Fuel className="h-6 w-6" />
              Abastecimentos
            </h1>
            <p className="text-muted-foreground">Registro e consulta de abastecimentos da frota</p>
          </div>
          {canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Abastecimento
            </Button>
          )}
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Litros</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(resumo.totalLitros)}</div>
              <p className="text-xs text-muted-foreground">litros abastecidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(resumo.gastoTotal)}</div>
              <p className="text-xs text-muted-foreground">no período filtrado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Preço/Litro</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resumo.mediaPrecoLitro > 0 ? `R$ ${formatNumber(resumo.mediaPrecoLitro, 3)}` : '-'}
              </div>
              <p className="text-xs text-muted-foreground">média ponderada</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média KM/Litro</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resumo.mediaKmL > 0 ? `${formatNumber(resumo.mediaKmL)} km/l` : '-'}
              </div>
              <p className="text-xs text-muted-foreground">eficiência média</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Veículo</Label>
                <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos">Todos</SelectItem>
                    {veiculosFilter?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.placa} {v.apelido ? `- ${v.apelido}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select value={filtroProjeto} onValueChange={setFiltroProjeto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos">Todos</SelectItem>
                    {projetosFilter?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.os} - {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Busca</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Posto ou placa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredAbastecimentos.length} abastecimento{filteredAbastecimentos.length !== 1 && 's'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredAbastecimentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum abastecimento encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead className="text-right">Litros</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Preço/L</TableHead>
                      <TableHead className="text-right">KM/L</TableHead>
                      <TableHead>Posto</TableHead>
                      <TableHead>Pgto</TableHead>
                      <TableHead>Conciliado</TableHead>
                      {canEdit && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAbastecimentos.map((ab) => (
                      <TableRow key={ab.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(ab.data_abastecimento)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">
                              {ab.veiculos?.placa || '-'}
                            </code>
                            {ab.veiculos?.apelido && (
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {ab.veiculos.apelido}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {ab.collaborators?.full_name || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ab.projetos ? (
                            <span>
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">{ab.projetos.os}</code>
                              {ab.projetos.nome}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {ab.litros ? formatNumber(ab.litros) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(ab.valor_total)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {ab.preco_litro ? `R$ ${formatNumber(ab.preco_litro, 3)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {ab.km_por_litro && ab.km_por_litro > 0 ? `${formatNumber(ab.km_por_litro)}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate" title={ab.posto_nome || ''}>
                          {ab.posto_nome || '-'}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {ab.forma_pagamento || '-'}
                        </TableCell>
                        <TableCell>
                          {ab.conciliado_omie ? (
                            <Badge variant="default" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                              Conciliado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(ab)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(ab)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <AbastecimentoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        abastecimento={selectedAbastecimento}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['abastecimentos'] })}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir abastecimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este abastecimento?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
