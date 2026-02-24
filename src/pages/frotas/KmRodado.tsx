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
import { Plus, Pencil, Trash2, GanttChart, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import KmRegistroForm from '@/components/frotas/KmRegistroForm';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';

type RegistroKm = {
  id: string;
  veiculo_id: string;
  colaborador_id: string | null;
  projeto_id: string | null;
  tipo: string;
  km_registrado: number;
  km_calculado: number | null;
  foto_odometro_url: string | null;
  data_registro: string;
  created_at: string;
  veiculos: { placa: string; apelido: string | null } | null;
  collaborators: { full_name: string } | null;
  projetos: { nome: string; os: string } | null;
};

export default function KmRodado() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroKm | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [registroToDelete, setRegistroToDelete] = useState<RegistroKm | null>(null);

  // Filtros
  const [filtroVeiculo, setFiltroVeiculo] = useState('_todos');
  const [filtroProjeto, setFiltroProjeto] = useState('_todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const canEdit = hasRole('admin') || hasRole('rh');

  const { data: registros, isLoading } = useQuery({
    queryKey: ['registros-km'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registros_km')
        .select(`
          *,
          veiculos:veiculo_id (placa, apelido),
          collaborators:colaborador_id (full_name),
          projetos:projeto_id (nome, os)
        `)
        .order('data_registro', { ascending: false });

      if (error) throw error;
      return data as RegistroKm[];
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

  const filteredRegistros = useMemo(() => {
    if (!registros) return [];
    return registros.filter((r) => {
      if (filtroVeiculo !== '_todos' && r.veiculo_id !== filtroVeiculo) return false;
      if (filtroProjeto !== '_todos' && r.projeto_id !== filtroProjeto) return false;
      if (filtroDataInicio) {
        const dataReg = new Date(r.data_registro).toISOString().slice(0, 10);
        if (dataReg < filtroDataInicio) return false;
      }
      if (filtroDataFim) {
        const dataReg = new Date(r.data_registro).toISOString().slice(0, 10);
        if (dataReg > filtroDataFim) return false;
      }
      return true;
    });
  }, [registros, filtroVeiculo, filtroProjeto, filtroDataInicio, filtroDataFim]);

  const handleNew = () => {
    setSelectedRegistro(null);
    setFormOpen(true);
  };

  const handleEdit = (registro: RegistroKm) => {
    setSelectedRegistro(registro);
    setFormOpen(true);
  };

  const confirmDelete = (registro: RegistroKm) => {
    setRegistroToDelete(registro);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!registroToDelete) return;

    try {
      const { error } = await supabase
        .from('registros_km')
        .delete()
        .eq('id', registroToDelete.id);

      if (error) throw error;
      toast.success('Registro excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['registros-km'] });
    } catch (error: any) {
      toast.error('Erro ao excluir registro: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setRegistroToDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatKm = (km: number | null) => {
    if (km === null || km === undefined) return '-';
    return km.toLocaleString('pt-BR') + ' km';
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'saida') {
      return <Badge variant="default" className="bg-blue-500/20 text-blue-500 border-blue-500/30">Saída</Badge>;
    }
    return <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">Volta</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <GanttChart className="h-6 w-6" />
              KM Rodado
            </h1>
            <p className="text-muted-foreground">Registro e consulta de quilometragem dos veículos</p>
          </div>
          {canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Registro
            </Button>
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredRegistros.length} registro{filteredRegistros.length !== 1 && 's'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredRegistros.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum registro encontrado
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>KM Registrado</TableHead>
                      <TableHead>KM Viagem</TableHead>
                      <TableHead>Foto</TableHead>
                      {canEdit && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistros.map((registro) => (
                      <TableRow key={registro.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(registro.data_registro)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">
                              {registro.veiculos?.placa || '-'}
                            </code>
                            {registro.veiculos?.apelido && (
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {registro.veiculos.apelido}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {registro.collaborators?.full_name || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {registro.projetos ? (
                            <span>
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs mr-1">{registro.projetos.os}</code>
                              {registro.projetos.nome}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getTipoBadge(registro.tipo)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatKm(registro.km_registrado)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {registro.tipo === 'volta' && registro.km_calculado !== null
                            ? formatKm(registro.km_calculado)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {registro.foto_odometro_url ? (
                            <a
                              href={registro.foto_odometro_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <Image className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(registro)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(registro)}
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
      <KmRegistroForm
        open={formOpen}
        onOpenChange={setFormOpen}
        registro={selectedRegistro}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['registros-km'] })}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de KM?
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
