import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { 
  HardHat, 
  RotateCcw, 
  AlertCircle, 
  Shirt, 
  Shield, 
  Utensils, 
  Heart,
  FileText,
  RefreshCw,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import { useBudgetLaborCatalog } from '@/hooks/orcamentos/useBudgetLaborCatalog';
import { useLaborIncidenceGroups, useLaborIncidenceItems, useLaborIncidenceTemplates } from '@/hooks/orcamentos/useLaborIncidenceCatalog';
import { useLaborRoleIncidences, LaborRoleIncidenceCost } from '@/hooks/orcamentos/useLaborRoleIncidences';
import { PriceContextSelector } from '@/components/orcamentos/bases/PriceContextSelector';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

const GROUP_ICONS: Record<string, React.ReactNode> = {
  'A': <FileText className="h-4 w-4" />,
  'B': <Shirt className="h-4 w-4" />,
  'C': <Shield className="h-4 w-4" />,
  'D': <Utensils className="h-4 w-4" />,
  'E': <Heart className="h-4 w-4" />,
};

const CALC_TIPO_LABELS: Record<string, string> = {
  'RATEIO_MESES': 'Rateio',
  'MENSAL': 'Mensal',
};

interface IncidenceItemRowProps {
  item: LaborRoleIncidenceCost;
  catalogItem?: any;
  onToggle: (ativo: boolean) => void;
  onUpdate: (updates: any) => void;
  onReset: () => void;
  isUpdating: boolean;
}

function IncidenceItemRow({ 
  item, 
  catalogItem,
  onToggle, 
  onUpdate, 
  onReset,
  isUpdating 
}: IncidenceItemRowProps) {
  const hasAnyOverride = item.has_preco_override || item.has_qtd_override || 
    item.has_meses_override || item.has_qtd_mes_override || item.has_valor_mensal_override;

  const isRateio = item.calc_tipo === 'RATEIO_MESES';

  return (
    <TableRow className={cn(!item.ativo && "opacity-50 bg-muted/30")}>
      {/* Checkbox */}
      <TableCell className="w-10 text-center">
        <Checkbox 
          checked={item.ativo}
          onCheckedChange={(checked) => onToggle(!!checked)}
          disabled={isUpdating}
        />
      </TableCell>
      
      {/* Código */}
      <TableCell className="w-16 font-mono text-xs">
        {item.item_codigo}
      </TableCell>
      
      {/* Descrição */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-sm">{item.item_descricao}</span>
          {item.obrigatorio && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0">
              Obrig.
            </Badge>
          )}
        </div>
      </TableCell>
      
      {/* Tipo */}
      <TableCell className="w-20">
        <span className="text-xs text-muted-foreground">
          {CALC_TIPO_LABELS[item.calc_tipo] || item.calc_tipo}
        </span>
      </TableCell>
      
      {/* Qtd */}
      <TableCell className="w-20">
        {isRateio ? (
          <Input
            type="number"
            value={item.qtd ?? ''}
            onChange={(e) => onUpdate({ qtd_override: e.target.value ? Number(e.target.value) : null })}
            disabled={!item.ativo || isUpdating}
            className={cn(
              "h-7 text-xs w-16",
              item.has_qtd_override && "border-primary"
            )}
            placeholder={catalogItem?.qtd_default?.toString() ?? '1'}
          />
        ) : (
          <Input
            type="number"
            value={item.qtd_mes ?? ''}
            onChange={(e) => onUpdate({ qtd_mes_override: e.target.value ? Number(e.target.value) : null })}
            disabled={!item.ativo || isUpdating}
            className={cn(
              "h-7 text-xs w-16",
              item.has_qtd_mes_override && "border-primary"
            )}
            placeholder={catalogItem?.qtd_mes_default?.toString() ?? '-'}
          />
        )}
      </TableCell>
      
      {/* Preço Unit */}
      <TableCell className="w-24">
        {(isRateio || (!item.valor_mensal && item.calc_tipo === 'MENSAL')) && (
          <Input
            type="number"
            step="0.01"
            value={item.preco_unitario ?? ''}
            onChange={(e) => onUpdate({ preco_unitario_override: e.target.value ? Number(e.target.value) : null })}
            disabled={!item.ativo || isUpdating}
            className={cn(
              "h-7 text-xs w-20",
              item.has_preco_override && "border-primary"
            )}
            placeholder={catalogItem?.preco_unitario_default?.toString() ?? '-'}
          />
        )}
      </TableCell>
      
      {/* Meses/Vida útil (only for RATEIO) */}
      <TableCell className="w-20">
        {isRateio ? (
          <Input
            type="number"
            value={item.meses ?? ''}
            onChange={(e) => onUpdate({ meses_override: e.target.value ? Number(e.target.value) : null })}
            disabled={!item.ativo || isUpdating}
            className={cn(
              "h-7 text-xs w-16",
              item.has_meses_override && "border-primary"
            )}
            placeholder={catalogItem?.meses_default?.toString() ?? '12'}
          />
        ) : (
          <Input
            type="number"
            step="0.01"
            value={item.valor_mensal ?? ''}
            onChange={(e) => onUpdate({ valor_mensal_override: e.target.value ? Number(e.target.value) : null })}
            disabled={!item.ativo || isUpdating}
            className={cn(
              "h-7 text-xs w-20",
              item.has_valor_mensal_override && "border-primary"
            )}
            placeholder={catalogItem?.valor_mensal_default?.toString() ?? '-'}
          />
        )}
      </TableCell>
      
      {/* Custo Mensal (calculated) */}
      <TableCell className="w-28 text-right">
        <span className={cn(
          "font-medium text-sm",
          item.ativo && item.custo_mensal_por_pessoa > 0 && "text-primary"
        )}>
          {formatCurrency(item.custo_mensal_por_pessoa)}
        </span>
      </TableCell>
      
      {/* Actions */}
      <TableCell className="w-10">
        {hasAnyOverride && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={onReset}
                disabled={isUpdating}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resetar para padrão</TooltipContent>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function IncidenciasMO() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [activeTab, setActiveTab] = useState('A');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [regiaoId, setRegiaoId] = useState<string | null>(null);
  
  // Fetch data - using items from useBudgetLaborCatalog (fix bug #1)
  const { items: roles, isLoading: rolesLoading } = useBudgetLaborCatalog();
  const { data: groups, isLoading: groupsLoading } = useLaborIncidenceGroups();
  const { data: catalogItems, isLoading: catalogLoading } = useLaborIncidenceItems();
  const { data: templates } = useLaborIncidenceTemplates();
  const { 
    incidences, 
    totals, 
    isLoading: incidencesLoading, 
    toggleItem, 
    updateOverride, 
    resetOverrides,
    applyAllCatalogItems,
    applyTemplate
  } = useLaborRoleIncidences(selectedRoleId);
  
  // Filter roles by search
  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    const search = roleSearch.toLowerCase();
    return roles.filter(r => 
      r.codigo.toLowerCase().includes(search) || 
      r.nome.toLowerCase().includes(search)
    );
  }, [roles, roleSearch]);
  
  // Group incidences by group code
  const incidencesByGroup = useMemo(() => {
    const grouped: Record<string, LaborRoleIncidenceCost[]> = {};
    groups?.forEach(g => { grouped[g.codigo] = []; });
    incidences.forEach(inc => {
      if (grouped[inc.group_codigo]) {
        grouped[inc.group_codigo].push(inc);
      }
    });
    return grouped;
  }, [incidences, groups]);
  
  // Create a map of catalog items by ID
  const catalogItemsMap = useMemo(() => {
    const map: Record<string, any> = {};
    catalogItems?.forEach(item => { map[item.id] = item; });
    return map;
  }, [catalogItems]);
  
  // Calculate totals by group
  const totalsByGroup = useMemo(() => {
    const totals: Record<string, number> = {};
    groups?.forEach(g => {
      totals[g.codigo] = incidencesByGroup[g.codigo]
        ?.filter(i => i.ativo)
        .reduce((sum, i) => sum + (i.custo_mensal_por_pessoa ?? 0), 0) ?? 0;
    });
    return totals;
  }, [incidencesByGroup, groups]);
  
  // Calculate total geral
  const totalGeral = useMemo(() => {
    return Object.values(totalsByGroup).reduce((sum, v) => sum + v, 0);
  }, [totalsByGroup]);
  
  const selectedRole = roles?.find(r => r.id === selectedRoleId);
  
  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  const handleApplyCatalog = () => {
    if (selectedRoleId && catalogItems && catalogItems.length > 0) {
      applyAllCatalogItems.mutate();
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    if (selectedRoleId) {
      applyTemplate.mutate(templateId);
    }
  };

  // Show empty states
  if (groupsLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="container py-6 space-y-6">
        <Card className="p-8 text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Sem grupos de incidências cadastrados.</p>
          <p className="text-sm">Entre em contato com o administrador do sistema.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6 text-orange-500" />
            Incidências por Função
          </h1>
          <p className="text-muted-foreground text-sm">
            EPIs, uniformes, alimentação e benefícios por função de MO
          </p>
        </div>
        <Button variant="outline" size="sm" disabled>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Importar XLSX
        </Button>
      </div>

      {/* Context Selector: Empresa + Região */}
      <Card className="p-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PriceContextSelector
            empresaId={empresaId}
            regiaoId={regiaoId}
            onEmpresaChange={setEmpresaId}
            onRegiaoChange={setRegiaoId}
          />
          {/* Total Geral Badge */}
          {selectedRoleId && totalGeral > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium">Total Incidências/pessoa/mês:</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalGeral)}</span>
            </div>
          )}
        </div>
      </Card>
      
      {/* Role Selector */}
      <Card className="p-3">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar função..."
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={selectedRoleId ?? ''} onValueChange={handleRoleSelect}>
            <SelectTrigger className="w-80 h-9">
              <SelectValue placeholder="Selecione uma função de MO" />
            </SelectTrigger>
            <SelectContent>
              {rolesLoading ? (
                <SelectItem value="__loading__" disabled>Carregando...</SelectItem>
              ) : filteredRoles.length === 0 ? (
                <SelectItem value="__empty__" disabled>Nenhuma função encontrada</SelectItem>
              ) : (
                filteredRoles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    <span className="font-mono text-xs mr-2">{role.codigo}</span>
                    {role.nome}
                    <Badge variant="outline" className="ml-2 text-[10px]">{role.tipo_mo}</Badge>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          {selectedRoleId && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleApplyCatalog}
                disabled={applyAllCatalogItems.isPending || !catalogItems?.length}
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  applyAllCatalogItems.isPending && "animate-spin"
                )} />
                {!catalogItems?.length ? 'Catálogo vazio' : 'Aplicar Catálogo'}
              </Button>
              
              {templates && templates.length > 0 && (
                <Select onValueChange={handleApplyTemplate}>
                  <SelectTrigger className="w-44 h-9">
                    <SelectValue placeholder="Aplicar Template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>
      </Card>
      
      {/* Content */}
      {!selectedRoleId ? (
        <Card className="p-8 text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione uma função para configurar as incidências.</p>
        </Card>
      ) : incidencesLoading || catalogLoading ? (
        <Card className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {groups.map(group => (
              <Card 
                key={group.codigo}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  activeTab === group.codigo && "ring-2 ring-primary"
                )}
                onClick={() => setActiveTab(group.codigo)}
              >
                <CardContent className="p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    {GROUP_ICONS[group.codigo]}
                    <span className="font-medium text-xs">{group.codigo}</span>
                  </div>
                  <div className="text-base font-bold text-primary">
                    {formatCurrency(totalsByGroup[group.codigo] ?? 0)}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate">
                    {group.nome}
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Total Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="font-medium text-xs">TOTAL</span>
                </div>
                <div className="text-base font-bold text-primary">
                  {formatCurrency(totalGeral)}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  /pessoa/mês
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tabs with Items Table */}
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-2 pt-3">
                <TabsList className="grid grid-cols-5 w-fit">
                  {groups.map(group => (
                    <TabsTrigger key={group.codigo} value={group.codigo} className="gap-1 text-xs">
                      {GROUP_ICONS[group.codigo]}
                      {group.codigo}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardHeader>
              <CardContent className="pt-2 px-3 pb-3">
                {groups.map(group => (
                  <TabsContent key={group.codigo} value={group.codigo} className="m-0">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-10 text-center text-xs">Ativo</TableHead>
                            <TableHead className="text-xs">Código</TableHead>
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Qtd</TableHead>
                            <TableHead className="text-xs">R$ Unit</TableHead>
                            <TableHead className="text-xs">Meses / R$ Mensal</TableHead>
                            <TableHead className="text-xs text-right">Custo/Mês</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incidencesByGroup[group.codigo]?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="p-6 text-center text-muted-foreground text-sm">
                                {catalogItems?.length === 0 
                                  ? 'Catálogo de incidências vazio. Contate o administrador.'
                                  : 'Clique em "Aplicar Catálogo" para adicionar itens.'}
                              </TableCell>
                            </TableRow>
                          ) : (
                            incidencesByGroup[group.codigo]?.map(item => (
                              <IncidenceItemRow
                                key={item.id}
                                item={item}
                                catalogItem={catalogItemsMap[item.incidence_item_id]}
                                onToggle={(ativo) => toggleItem.mutate({ itemId: item.incidence_item_id, ativo })}
                                onUpdate={(updates) => updateOverride.mutate({ 
                                  incidenceId: item.id, 
                                  itemId: item.incidence_item_id,
                                  updates 
                                })}
                                onReset={() => resetOverrides.mutate(item.id)}
                                isUpdating={toggleItem.isPending || updateOverride.isPending}
                              />
                            ))
                          )}
                        </TableBody>
                        {/* Group Subtotal Footer */}
                        {incidencesByGroup[group.codigo]?.length > 0 && (
                          <TableFooter>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={7} className="text-right font-medium text-sm">
                                Custo Mensal por Pessoa [{group.codigo}]:
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary">
                                {formatCurrency(totalsByGroup[group.codigo] ?? 0)}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableFooter>
                        )}
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </CardContent>
            </Tabs>
          </Card>
        </>
      )}
    </div>
  );
}
