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
  FileSpreadsheet,
  Eye,
  Users
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

const GROUP_COLUMN_HEADERS: Record<string, { qtyLabel: string; priceLabel: string; monthsLabel: string | null }> = {
  'A': { qtyLabel: 'Qtd', priceLabel: 'Preço por Bateria', monthsLabel: 'Rotatividade (meses)' },
  'B': { qtyLabel: 'Qtd Fornecida', priceLabel: 'Preço Unitário', monthsLabel: 'Vida Útil (meses)' },
  'C': { qtyLabel: 'Qtd Fornecida', priceLabel: 'Preço Unitário', monthsLabel: 'Vida Útil (meses)' },
  'D': { qtyLabel: 'Qtd Fornecida/Mês', priceLabel: 'Preço Unitário', monthsLabel: null },
  'E': { qtyLabel: 'Qtd', priceLabel: 'Preço Unitário', monthsLabel: 'Vida Útil (meses)' },
};

const CALC_TIPO_LABELS: Record<string, string> = {
  'RATEIO_MESES': 'Rateio',
  'MENSAL': 'Mensal',
};

type ViewMode = 'catalog' | 'roles';

// Calculate monthly cost from catalog item
function calculateMonthlyCost(item: any): number {
  if (!item.obrigatorio_default) return 0;
  
  if (item.calc_tipo === 'RATEIO_MESES') {
    if (item.preco_unitario_default && item.meses_default) {
      return Math.round(((item.qtd_default ?? 1) * item.preco_unitario_default) / item.meses_default * 100) / 100;
    }
  } else if (item.calc_tipo === 'MENSAL') {
    if (item.valor_mensal_default) {
      return item.valor_mensal_default;
    }
    if (item.qtd_mes_default && item.preco_unitario_default) {
      return Math.round(item.qtd_mes_default * item.preco_unitario_default * 100) / 100;
    }
  }
  return 0;
}

// Get observation text for display
function getObservation(item: any): string {
  if (!item.obrigatorio_default) return 'Não aplicável';
  if (item.obrigatorio_default && !item.preco_unitario_default && !item.valor_mensal_default) return 'Dados incompletos';
  return item.observacao_default ?? '';
}

// Catalog Item Row for the global view
interface CatalogItemRowProps {
  item: any;
  groupCode: string;
}

function CatalogItemRow({ item, groupCode }: CatalogItemRowProps) {
  const headers = GROUP_COLUMN_HEADERS[groupCode];
  const monthlyCost = calculateMonthlyCost(item);
  const observation = getObservation(item);
  const isApplicable = item.obrigatorio_default;
  const isRateio = item.calc_tipo === 'RATEIO_MESES';
  
  return (
    <TableRow className={cn(!isApplicable && "opacity-50 bg-muted/30")}>
      {/* Código */}
      <TableCell className="w-16 font-mono text-xs font-medium">
        {item.codigo}
      </TableCell>
      
      {/* Descrição */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-sm">{item.descricao}</span>
          {isApplicable && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">
              Obrigatório
            </Badge>
          )}
        </div>
      </TableCell>
      
      {/* Quantidade */}
      <TableCell className="w-20 text-center">
        {isRateio ? (
          <span className="text-sm">{item.qtd_default ?? '-'}</span>
        ) : (
          <span className="text-sm">{item.qtd_mes_default ?? '-'}</span>
        )}
      </TableCell>
      
      {/* Preço Unitário */}
      <TableCell className="w-28 text-right">
        <span className="text-sm">
          {item.preco_unitario_default ? formatCurrency(item.preco_unitario_default) : '-'}
        </span>
      </TableCell>
      
      {/* Meses/Vida útil (only for RATEIO groups) */}
      {headers.monthsLabel && (
        <TableCell className="w-24 text-center">
          {isRateio ? (
            <span className="text-sm">{item.meses_default ?? '-'}</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
      )}
      
      {/* Custo Mensal por Pessoa */}
      <TableCell className="w-32 text-right">
        <span className={cn(
          "font-semibold text-sm",
          isApplicable && monthlyCost > 0 && "text-primary"
        )}>
          {formatCurrency(monthlyCost)}
        </span>
      </TableCell>
      
      {/* Observações */}
      <TableCell className="w-32">
        <span className={cn(
          "text-xs",
          !isApplicable && "text-muted-foreground italic"
        )}>
          {observation}
        </span>
      </TableCell>
    </TableRow>
  );
}

// Role incidence row (existing functionality)
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
  const [viewMode, setViewMode] = useState<ViewMode>('catalog');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [activeTab, setActiveTab] = useState('A');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [regiaoId, setRegiaoId] = useState<string | null>(null);
  
  // Fetch data
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
  
  // Group catalog items by group code
  const catalogByGroup = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    groups?.forEach(g => { grouped[g.codigo] = []; });
    catalogItems?.forEach(item => {
      // item.group_codigo comes from the hook mapping
      if (item.group_codigo && grouped[item.group_codigo]) {
        grouped[item.group_codigo].push(item);
      }
    });
    return grouped;
  }, [catalogItems, groups]);
  
  // Calculate catalog totals by group
  const catalogTotalsByGroup = useMemo(() => {
    const totals: Record<string, number> = {};
    groups?.forEach(g => {
      totals[g.codigo] = catalogByGroup[g.codigo]
        ?.reduce((sum, item) => sum + calculateMonthlyCost(item), 0) ?? 0;
    });
    return totals;
  }, [catalogByGroup, groups]);
  
  // Calculate catalog total geral
  const catalogTotalGeral = useMemo(() => {
    return Object.values(catalogTotalsByGroup).reduce((sum, v) => sum + v, 0);
  }, [catalogTotalsByGroup]);
  
  // Group incidences by group code (for role view)
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
  
  // Calculate role totals by group
  const roleTotalsByGroup = useMemo(() => {
    const totals: Record<string, number> = {};
    groups?.forEach(g => {
      totals[g.codigo] = incidencesByGroup[g.codigo]
        ?.filter(i => i.ativo)
        .reduce((sum, i) => sum + (i.custo_mensal_por_pessoa ?? 0), 0) ?? 0;
    });
    return totals;
  }, [incidencesByGroup, groups]);
  
  // Calculate role total geral
  const roleTotalGeral = useMemo(() => {
    return Object.values(roleTotalsByGroup).reduce((sum, v) => sum + v, 0);
  }, [roleTotalsByGroup]);
  
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

  // Get active totals and items based on view mode
  const activeTotalsByGroup = viewMode === 'catalog' ? catalogTotalsByGroup : roleTotalsByGroup;
  const activeTotalGeral = viewMode === 'catalog' ? catalogTotalGeral : roleTotalGeral;

  return (
    <div className="container py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6 text-orange-500" />
            Incidências de Mão de Obra Indireta
          </h1>
          <p className="text-muted-foreground text-sm">
            Detalhamento de custos: EPIs, uniformes, alimentação e benefícios
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-muted rounded-lg p-1 flex">
            <Button
              variant={viewMode === 'catalog' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('catalog')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Catálogo Padrão
            </Button>
            <Button
              variant={viewMode === 'roles' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('roles')}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Por Função
            </Button>
          </div>
        </div>
      </div>

      {/* Context Selector for role view */}
      {viewMode === 'roles' && (
        <Card className="p-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <PriceContextSelector
              empresaId={empresaId}
              regiaoId={regiaoId}
              onEmpresaChange={setEmpresaId}
              onRegiaoChange={setRegiaoId}
            />
            {selectedRoleId && roleTotalGeral > 0 && (
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium">Total Incidências/pessoa/mês:</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(roleTotalGeral)}</span>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Role Selector (only in role mode) */}
      {viewMode === 'roles' && (
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
      )}

      {/* Loading state */}
      {catalogLoading ? (
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
                    <span className="font-medium text-xs">[{group.codigo}]</span>
                  </div>
                  <div className="text-base font-bold text-primary">
                    {formatCurrency(activeTotalsByGroup[group.codigo] ?? 0)}
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
                  {formatCurrency(activeTotalGeral)}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  /pessoa/mês
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Catalog View Content */}
          {viewMode === 'catalog' && (
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
                  {groups.map(group => {
                    const headers = GROUP_COLUMN_HEADERS[group.codigo];
                    return (
                      <TabsContent key={group.codigo} value={group.codigo} className="m-0">
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs">Código</TableHead>
                                <TableHead className="text-xs">Descrição</TableHead>
                                <TableHead className="text-xs text-center">{headers.qtyLabel}</TableHead>
                                <TableHead className="text-xs text-right">{headers.priceLabel}</TableHead>
                                {headers.monthsLabel && (
                                  <TableHead className="text-xs text-center">{headers.monthsLabel}</TableHead>
                                )}
                                <TableHead className="text-xs text-right">Custo Mensal/Pessoa</TableHead>
                                <TableHead className="text-xs">Observações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {catalogByGroup[group.codigo]?.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={headers.monthsLabel ? 7 : 6} className="p-6 text-center text-muted-foreground text-sm">
                                    Nenhum item cadastrado para este grupo.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                catalogByGroup[group.codigo]?.map(item => (
                                  <CatalogItemRow
                                    key={item.id}
                                    item={item}
                                    groupCode={group.codigo}
                                  />
                                ))
                              )}
                            </TableBody>
                            {/* Group Subtotal Footer */}
                            {catalogByGroup[group.codigo]?.length > 0 && (
                              <TableFooter>
                                <TableRow className="bg-primary/5">
                                  <TableCell colSpan={headers.monthsLabel ? 5 : 4} className="text-right font-semibold text-sm">
                                    Custo Mensal por Pessoa [{group.codigo}]:
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-lg text-primary">
                                    {formatCurrency(catalogTotalsByGroup[group.codigo] ?? 0)}
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              </TableFooter>
                            )}
                          </Table>
                        </div>
                      </TabsContent>
                    );
                  })}
                </CardContent>
              </Tabs>
            </Card>
          )}

          {/* Role View Content */}
          {viewMode === 'roles' && !selectedRoleId && (
            <Card className="p-8 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma função para configurar as incidências.</p>
            </Card>
          )}

          {viewMode === 'roles' && selectedRoleId && incidencesLoading && (
            <Card className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-64 w-full" />
            </Card>
          )}

          {viewMode === 'roles' && selectedRoleId && !incidencesLoading && (
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
                                  {formatCurrency(roleTotalsByGroup[group.codigo] ?? 0)}
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
          )}

          {/* Total Geral Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Total Geral por Pessoa/Mês</h3>
                  <p className="text-sm text-muted-foreground">
                    Soma de todos os grupos (A + B + C + D + E)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(activeTotalGeral)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {viewMode === 'catalog' ? 'Valores do catálogo padrão' : 'Valores da função selecionada'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
