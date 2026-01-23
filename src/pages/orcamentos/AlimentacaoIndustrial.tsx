import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Zap, Package, ArrowRight, Lock } from 'lucide-react';
import { useCircuits, type CircuitFormData } from '@/hooks/orcamentos/useCircuits';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function AlimentacaoIndustrial() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const {
    circuits,
    generatedMaterials,
    isLoading,
    createCircuit,
    updateCircuit,
    deleteCircuit,
    generateMaterials,
    applyToLevantamento,
  } = useCircuits(selectedRevision?.id);

  const [newCircuit, setNewCircuit] = useState<CircuitFormData>({
    tag: '',
    tipo_partida: 'DIRETO',
    kw: 0,
    tensao_v: 380,
    corrente_in_a: 0,
  });

  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  const handleAddCircuit = async () => {
    if (!newCircuit.tag) return;
    await createCircuit.mutateAsync(newCircuit);
    setNewCircuit({
      tag: '',
      tipo_partida: 'DIRETO',
      kw: 0,
      tensao_v: 380,
      corrente_in_a: 0,
    });
  };

  const handleUpdateField = (id: string, field: string, value: string | number | null) => {
    updateCircuit.mutate({ id, [field]: value });
  };

  const handleToggleMaterial = (id: string) => {
    setSelectedMaterials(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleApplySelected = async () => {
    if (selectedMaterials.length === 0) return;
    await applyToLevantamento.mutateAsync(selectedMaterials);
    setSelectedMaterials([]);
  };

  const pendingMaterials = generatedMaterials.filter(m => m.status === 'PENDENTE');
  const appliedMaterials = generatedMaterials.filter(m => m.status === 'APLICADO');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (lockState.isLocked) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Revisão bloqueada. Não é possível editar a alimentação industrial.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Alimentação Industrial
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastrar circuitos, gerar materiais e aplicar no levantamento
        </p>
      </div>

      {/* Circuits Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Circuitos</CardTitle>
          <CardDescription>Lista de circuitos elétricos do projeto</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Tag</TableHead>
                <TableHead className="w-28">Tipo Partida</TableHead>
                <TableHead className="w-24 text-right">kW</TableHead>
                <TableHead className="w-24 text-right">Tensão (V)</TableHead>
                <TableHead className="w-24 text-right">Corrente (A)</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {circuits.map((circuit) => (
                <TableRow key={circuit.id}>
                  <TableCell>
                    <Input
                      value={circuit.tag}
                      onChange={(e) => handleUpdateField(circuit.id, 'tag', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={circuit.tipo_partida || ''}
                      onChange={(e) => handleUpdateField(circuit.id, 'tipo_partida', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="DIRETO"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={circuit.kw || ''}
                      onChange={(e) => handleUpdateField(circuit.id, 'kw', parseFloat(e.target.value) || null)}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={circuit.tensao_v || ''}
                      onChange={(e) => handleUpdateField(circuit.id, 'tensao_v', parseFloat(e.target.value) || null)}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={circuit.corrente_in_a || ''}
                      onChange={(e) => handleUpdateField(circuit.id, 'corrente_in_a', parseFloat(e.target.value) || null)}
                      className="h-8 text-xs text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateMaterials.mutate(circuit.id)}
                        disabled={generateMaterials.isPending}
                        className="h-8 text-xs"
                      >
                        <Package className="h-3 w-3 mr-1" />
                        Gerar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCircuit.mutate(circuit.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* New circuit row */}
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input
                    placeholder="Ex: M-01"
                    value={newCircuit.tag}
                    onChange={(e) => setNewCircuit({ ...newCircuit, tag: e.target.value })}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="DIRETO"
                    value={newCircuit.tipo_partida || ''}
                    onChange={(e) => setNewCircuit({ ...newCircuit, tipo_partida: e.target.value })}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.1"
                    value={newCircuit.kw || ''}
                    onChange={(e) => setNewCircuit({ ...newCircuit, kw: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newCircuit.tensao_v || ''}
                    onChange={(e) => setNewCircuit({ ...newCircuit, tensao_v: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.1"
                    value={newCircuit.corrente_in_a || ''}
                    onChange={(e) => setNewCircuit({ ...newCircuit, corrente_in_a: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs text-right"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAddCircuit}
                    disabled={!newCircuit.tag || createCircuit.isPending}
                    className="h-8 w-8"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generated Materials Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Materiais Gerados</CardTitle>
              <CardDescription>
                Materiais calculados a partir dos circuitos. Selecione e aplique no levantamento.
              </CardDescription>
            </div>
            {pendingMaterials.length > 0 && (
              <Button
                onClick={handleApplySelected}
                disabled={selectedMaterials.length === 0 || applyToLevantamento.isPending}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Aplicar Selecionados ({selectedMaterials.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {generatedMaterials.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum material gerado.</p>
              <p className="text-sm">Clique em "Gerar" em um circuito para criar materiais.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-24">Circuito</TableHead>
                  <TableHead className="w-32">Código</TableHead>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead className="w-16">Un</TableHead>
                  <TableHead className="w-20 text-right">Qtd</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedMaterials.map((material) => {
                  const circuit = circuits.find(c => c.id === material.circuit_id);
                  const isPending = material.status === 'PENDENTE';
                  
                  return (
                    <TableRow key={material.id} className={!isPending ? 'opacity-60' : ''}>
                      <TableCell>
                        {isPending && (
                          <Checkbox
                            checked={selectedMaterials.includes(material.id)}
                            onCheckedChange={() => handleToggleMaterial(material.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {circuit?.tag || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {material.material_codigo}
                      </TableCell>
                      <TableCell className="text-xs">
                        {material.descricao}
                      </TableCell>
                      <TableCell className="text-xs">
                        {material.unidade}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {material.quantidade}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isPending ? 'secondary' : 'default'} className="text-xs">
                          {isPending ? 'Pendente' : 'Aplicado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {generatedMaterials.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total: {generatedMaterials.length} materiais</span>
          <span>•</span>
          <span>Pendentes: {pendingMaterials.length}</span>
          <span>•</span>
          <span>Aplicados: {appliedMaterials.length}</span>
        </div>
      )}
    </div>
  );
}
