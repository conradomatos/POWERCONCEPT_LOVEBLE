import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Trash2, Save } from 'lucide-react';
import { useTaxRules, type TaxRuleFormData } from '@/hooks/orcamentos/useTaxRules';
import { useMarkupRules, type MarkupFormData } from '@/hooks/orcamentos/useMarkupRules';
import { useMaterialCatalog, type CatalogFormData } from '@/hooks/orcamentos/useMaterialCatalog';
import { formatCurrency } from '@/lib/currency';

interface OutletContext {
  selectedRevision?: { id: string; status: string };
  lockState: { isLocked: boolean };
}

export default function Parametros() {
  const { selectedRevision, lockState } = useOutletContext<OutletContext>();
  const { rules: taxRules, isLoading: taxLoading, createRule, updateRule, deleteRule } = useTaxRules(selectedRevision?.id);
  const { markup, isLoading: markupLoading, upsertMarkup } = useMarkupRules(selectedRevision?.id);
  const { items: catalogItems, isLoading: catalogLoading, createItem: createCatalogItem, updateItem: updateCatalogItem, deleteItem: deleteCatalogItem } = useMaterialCatalog();

  const [newTax, setNewTax] = useState<TaxRuleFormData>({
    nome: '',
    tipo: 'PERCENT',
    valor: 0,
    base: 'SALE',
    aplica_em: 'ALL',
  });

  const [markupForm, setMarkupForm] = useState<MarkupFormData>({
    markup_pct: markup?.markup_pct ?? 15,
    allow_per_wbs: markup?.allow_per_wbs ?? false,
  });

  const [newCatalogItem, setNewCatalogItem] = useState<CatalogFormData>({
    codigo: '',
    descricao: '',
    unidade: 'pç',
    preco_ref: null,
    hh_unit_ref: null,
    categoria: null,
  });

  // Update form when markup loads
  useEffect(() => {
    if (markup) {
      setMarkupForm({
        markup_pct: markup.markup_pct,
        allow_per_wbs: markup.allow_per_wbs,
      });
    }
  }, [markup]);

  const handleAddTax = async () => {
    if (!newTax.nome) return;
    await createRule.mutateAsync(newTax);
    setNewTax({
      nome: '',
      tipo: 'PERCENT',
      valor: 0,
      base: 'SALE',
      aplica_em: 'ALL',
    });
  };

  const handleSaveMarkup = async () => {
    await upsertMarkup.mutateAsync(markupForm);
  };

  const handleAddCatalogItem = async () => {
    if (!newCatalogItem.codigo || !newCatalogItem.descricao) return;
    await createCatalogItem.mutateAsync(newCatalogItem);
    setNewCatalogItem({ codigo: '', descricao: '', unidade: 'pç', preco_ref: null, hh_unit_ref: null, categoria: null });
  };

  const isLoading = taxLoading || markupLoading || catalogLoading;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="impostos">
        <TabsList>
          <TabsTrigger value="impostos">Impostos</TabsTrigger>
          <TabsTrigger value="markup">Markup/BDI</TabsTrigger>
          <TabsTrigger value="catalogo">Base Materiais</TabsTrigger>
        </TabsList>

        {/* Tab: Impostos */}
        <TabsContent value="impostos">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Regras de Impostos</CardTitle>
              <CardDescription>Configure os impostos que incidem sobre o orçamento</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nome</TableHead>
                    <TableHead className="w-28">Tipo</TableHead>
                    <TableHead className="w-24 text-right">Valor</TableHead>
                    <TableHead className="w-28">Base</TableHead>
                    <TableHead className="w-32">Aplica Em</TableHead>
                    <TableHead className="w-20">Ativo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Input
                          value={rule.nome}
                          onChange={(e) => updateRule.mutate({ id: rule.id, nome: e.target.value })}
                          disabled={lockState.isLocked}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={rule.tipo}
                          onValueChange={(value) => updateRule.mutate({ id: rule.id, tipo: value as 'PERCENT' | 'FIXED' })}
                          disabled={lockState.isLocked}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENT">%</SelectItem>
                            <SelectItem value="FIXED">R$</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={rule.valor}
                          onChange={(e) => updateRule.mutate({ id: rule.id, valor: parseFloat(e.target.value) || 0 })}
                          disabled={lockState.isLocked}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={rule.base}
                          onValueChange={(value) => updateRule.mutate({ id: rule.id, base: value as 'SALE' | 'COST' })}
                          disabled={lockState.isLocked}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SALE">Venda</SelectItem>
                            <SelectItem value="COST">Custo</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={rule.aplica_em}
                          onValueChange={(value) => updateRule.mutate({ id: rule.id, aplica_em: value as 'ALL' | 'MATERIALS' | 'SERVICES' })}
                          disabled={lockState.isLocked}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Tudo</SelectItem>
                            <SelectItem value="MATERIALS">Materiais</SelectItem>
                            <SelectItem value="SERVICES">Serviços</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.ativo}
                          onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, ativo: checked })}
                          disabled={lockState.isLocked}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule.mutate(rule.id)}
                          disabled={lockState.isLocked}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {!lockState.isLocked && (
                    <TableRow className="bg-muted/30">
                      <TableCell>
                        <Input
                          placeholder="Ex: ISS, PIS, COFINS..."
                          value={newTax.nome}
                          onChange={(e) => setNewTax({ ...newTax, nome: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={newTax.tipo}
                          onValueChange={(value) => setNewTax({ ...newTax, tipo: value as 'PERCENT' | 'FIXED' })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENT">%</SelectItem>
                            <SelectItem value="FIXED">R$</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={newTax.valor || ''}
                          onChange={(e) => setNewTax({ ...newTax, valor: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={newTax.base}
                          onValueChange={(value) => setNewTax({ ...newTax, base: value as 'SALE' | 'COST' })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SALE">Venda</SelectItem>
                            <SelectItem value="COST">Custo</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={newTax.aplica_em}
                          onValueChange={(value) => setNewTax({ ...newTax, aplica_em: value as 'ALL' | 'MATERIALS' | 'SERVICES' })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Tudo</SelectItem>
                            <SelectItem value="MATERIALS">Materiais</SelectItem>
                            <SelectItem value="SERVICES">Serviços</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleAddTax}
                          disabled={!newTax.nome || createRule.isPending}
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Markup */}
        <TabsContent value="markup">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Markup / BDI</CardTitle>
              <CardDescription>Configure o percentual de markup aplicado sobre o custo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
                <div className="space-y-2">
                  <Label>Markup (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={markupForm.markup_pct}
                    onChange={(e) => setMarkupForm({ ...markupForm, markup_pct: parseFloat(e.target.value) || 0 })}
                    disabled={lockState.isLocked}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentual aplicado sobre o subtotal de custo
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Permitir markup por WBS</Label>
                  <div className="pt-2">
                    <Switch
                      checked={markupForm.allow_per_wbs}
                      onCheckedChange={(checked) => setMarkupForm({ ...markupForm, allow_per_wbs: checked })}
                      disabled={lockState.isLocked}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Permite definir markup diferente por pacote
                  </p>
                </div>
              </div>
              
              {!lockState.isLocked && (
                <div className="mt-6">
                  <Button onClick={handleSaveMarkup} disabled={upsertMarkup.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Markup
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Base Materiais */}
        <TabsContent value="catalogo">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Base de Materiais</CardTitle>
              <CardDescription>Catálogo de materiais para uso nos orçamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Código</TableHead>
                    <TableHead className="min-w-[200px]">Descrição</TableHead>
                    <TableHead className="w-16">Un</TableHead>
                    <TableHead className="w-28 text-right">Preço Ref</TableHead>
                    <TableHead className="w-24 text-right">HH Ref</TableHead>
                    <TableHead className="w-28">Categoria</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.codigo}
                          onChange={(e) => updateCatalogItem.mutate({ id: item.id, codigo: e.target.value })}
                          disabled={lockState.isLocked}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.descricao}
                          onChange={(e) => updateCatalogItem.mutate({ id: item.id, descricao: e.target.value })}
                          disabled={lockState.isLocked}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unidade}
                          onChange={(e) => updateCatalogItem.mutate({ id: item.id, unidade: e.target.value })}
                          disabled={lockState.isLocked}
                          className="h-8 text-xs w-14"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.preco_ref ?? ''}
                          onChange={(e) => updateCatalogItem.mutate({ id: item.id, preco_ref: parseFloat(e.target.value) || null })}
                          disabled={lockState.isLocked}
                          className="h-8 text-xs text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.hh_unit_ref ?? ''}
                          onChange={(e) => updateCatalogItem.mutate({ id: item.id, hh_unit_ref: parseFloat(e.target.value) || null })}
                          disabled={lockState.isLocked}
                          className="h-8 text-xs text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.categoria ?? ''}
                          onChange={(e) => updateCatalogItem.mutate({ id: item.id, categoria: e.target.value || null })}
                          disabled={lockState.isLocked}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCatalogItem.mutate(item.id)}
                          disabled={lockState.isLocked}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {!lockState.isLocked && (
                    <TableRow className="bg-muted/30">
                      <TableCell>
                        <Input
                          placeholder="Código"
                          value={newCatalogItem.codigo}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, codigo: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Descrição do material"
                          value={newCatalogItem.descricao}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, descricao: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newCatalogItem.unidade}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, unidade: e.target.value })}
                          className="h-8 text-xs w-14"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newCatalogItem.preco_ref ?? ''}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, preco_ref: parseFloat(e.target.value) || null })}
                          className="h-8 text-xs text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newCatalogItem.hh_unit_ref ?? ''}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, hh_unit_ref: parseFloat(e.target.value) || null })}
                          className="h-8 text-xs text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Categoria"
                          value={newCatalogItem.categoria ?? ''}
                          onChange={(e) => setNewCatalogItem({ ...newCatalogItem, categoria: e.target.value || null })}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleAddCatalogItem}
                          disabled={!newCatalogItem.codigo || !newCatalogItem.descricao || createCatalogItem.isPending}
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
