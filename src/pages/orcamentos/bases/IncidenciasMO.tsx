import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Search,
  Eye,
  Users,
  Tent,
  Plus
} from 'lucide-react';
import { useBudgetLaborCatalog } from '@/hooks/orcamentos/useBudgetLaborCatalog';
import { useLaborIncidenceGroups, useLaborIncidenceItems, useLaborIncidenceCatalog, type LaborIncidenceGroup, type LaborIncidenceItemInsert } from '@/hooks/orcamentos/useLaborIncidenceCatalog';
import { useLaborIncidenceByRole, useLaborIncidenceRoleRules, LaborIncidenceByRole } from '@/hooks/orcamentos/useLaborIncidenceRoleRules';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { AddIncidenceItemDialog } from '@/components/orcamentos/bases/AddIncidenceItemDialog';

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
      <TableCell className="w-16 font-mono text-xs font-medium">
        {item.codigo}
      </TableCell>
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
      <TableCell className="w-20 text-center">
        {isRateio ? (
          <span className="text-sm">{item.qtd_default ?? '-'}</span>
        ) : (
          <span className="text-sm">{item.qtd_mes_default ?? '-'}</span>
        )}
      </TableCell>
      <TableCell className="w-28 text-right">
        <span className="text-sm">
          {item.preco_unitario_default ? formatCurrency(item.preco_unitario_default) : '-'}
        </span>
      </TableCell>
      {headers.monthsLabel && (
        <TableCell className="w-24 text-center">
          {isRateio ? (
            <span className="text-sm">{item.meses_default ?? '-'}</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
      )}
      <TableCell className="w-32 text-right">
        <span className={cn(
          "font-semibold text-sm",
          isApplicable && monthlyCost > 0 && "text-primary"
        )}>
          {formatCurrency(monthlyCost)}
        </span>
      </TableCell>
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

// Role incidence row using the new view
interface RoleIncidenceRowProps {
  item: LaborIncidenceByRole;
  onToggleApplicable: (isApplicable: boolean) => void;
  onToggleMandatory: (isMandatory: boolean) => void;
  onUpdateOverride: (updates: any) => void;
  onReset: () => void;
  isUpdating: boolean;
}

function RoleIncidenceRow({ 
  item, 
  onToggleApplicable, 
  onToggleMandatory,
  onUpdateOverride,
  onReset,
  isUpdating 
}: RoleIncidenceRowProps) {
  const hasAnyOverride = item.rule_id !== null && (
    item.override_is_applicable !== null ||
    item.override_is_mandatory !== null ||
    item.override_qty !== null ||
    item.override_unit_price !== null ||
    item.override_months_factor !== null
  );
  
  const isRateio = item.calc_tipo === 'RATEIO_MESES';
  const isApplicable = item.is_applicable_final;
  const isMandatory = item.is_mandatory_final;

  // Get status label
  const getStatusLabel = () => {
    if (!isApplicable) return 'Não aplicável';
    if (isMandatory) return 'Obrigatório';
    return '';
  };

  return (
    <TableRow className={cn(!isApplicable && "opacity-50 bg-muted/30")}>
      {/* Aplicável Checkbox */}
      <TableCell className="w-14 text-center">
        <Checkbox 
          checked={isApplicable}
          onCheckedChange={(checked) => onToggleApplicable(!!checked)}
          disabled={isUpdating}
        />
      </TableCell>
      
      {/* Obrigatório Checkbox */}
      <TableCell className="w-14 text-center">
        <Checkbox 
          checked={isMandatory}
          onCheckedChange={(checked) => onToggleMandatory(!!checked)}
          disabled={isUpdating || !isApplicable}
        />
      </TableCell>
      
      {/* Código */}
      <TableCell className="w-16 font-mono text-xs">
        {item.item_codigo}
      </TableCell>
      
      {/* Descrição */}
      <TableCell>
        <span className="text-sm">{item.item_descricao}</span>
      </TableCell>
      
      {/* Tipo */}
      <TableCell className="w-16">
        <span className="text-xs text-muted-foreground">
          {CALC_TIPO_LABELS[item.calc_tipo] || item.calc_tipo}
        </span>
      </TableCell>
      
      {/* Qtd */}
      <TableCell className="w-20">
        {isRateio ? (
          <Input
            type="number"
            value={item.override_qty ?? ''}
            onChange={(e) => onUpdateOverride({ override_qty: e.target.value ? Number(e.target.value) : null })}
            disabled={!isApplicable || isUpdating}
            className={cn(
              "h-7 text-xs w-16",
              item.override_qty !== null && "border-primary"
            )}
            placeholder={item.qtd_default?.toString() ?? '1'}
          />
        ) : (
          <Input
            type="number"
            value={item.override_qty ?? ''}
            onChange={(e) => onUpdateOverride({ override_qty: e.target.value ? Number(e.target.value) : null })}
            disabled={!isApplicable || isUpdating}
            className={cn(
              "h-7 text-xs w-16",
              item.override_qty !== null && "border-primary"
            )}
            placeholder={item.qtd_mes_default?.toString() ?? '-'}
          />
        )}
      </TableCell>
      
      {/* Preço Unit */}
      <TableCell className="w-24">
        <Input
          type="number"
          step="0.01"
          value={item.override_unit_price ?? ''}
          onChange={(e) => onUpdateOverride({ override_unit_price: e.target.value ? Number(e.target.value) : null })}
          disabled={!isApplicable || isUpdating}
          className={cn(
            "h-7 text-xs w-20",
            item.override_unit_price !== null && "border-primary"
          )}
          placeholder={item.preco_unitario_default?.toString() ?? '-'}
        />
      </TableCell>
      
      {/* Meses */}
      <TableCell className="w-20">
        {isRateio && (
          <Input
            type="number"
            value={item.override_months_factor ?? ''}
            onChange={(e) => onUpdateOverride({ override_months_factor: e.target.value ? Number(e.target.value) : null })}
            disabled={!isApplicable || isUpdating}
            className={cn(
              "h-7 text-xs w-16",
              item.override_months_factor !== null && "border-primary"
            )}
            placeholder={item.meses_default?.toString() ?? '12'}
          />
        )}
      </TableCell>
      
      {/* Custo Mensal (calculated) */}
      <TableCell className="w-28 text-right">
        <span className={cn(
          "font-medium text-sm",
          isApplicable && item.custo_mensal_pessoa_final > 0 && "text-primary"
        )}>
          {formatCurrency(item.custo_mensal_pessoa_final)}
        </span>
      </TableCell>
      
      {/* Status */}
      <TableCell className="w-24">
        <span className={cn(
          "text-xs",
          !isApplicable && "text-muted-foreground italic",
          isMandatory && isApplicable && "text-primary font-medium"
        )}>
          {getStatusLabel()}
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
            <TooltipContent>Resetar para padrão do catálogo</TooltipContent>
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<LaborIncidenceGroup | null>(null);
  
  // Fetch data
  const { items: roles, isLoading: rolesLoading } = useBudgetLaborCatalog();
  const { data: groups, isLoading: groupsLoading } = useLaborIncidenceGroups();
  const { data: catalogItems, isLoading: catalogLoading } = useLaborIncidenceItems();
  const { createItem } = useLaborIncidenceCatalog();
  
  // Role-specific data using new view
  const { data: roleIncidences, isLoading: roleIncidencesLoading } = useLaborIncidenceByRole(selectedRoleId);
  const { 
    toggleApplicable, 
    toggleMandatory, 
    upsertRule, 
    resetRule,
    seedCampoDefaults 
  } = useLaborIncidenceRoleRules(selectedRoleId);
  
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
  
  // Group role incidences by group code
  const roleIncidencesByGroup = useMemo(() => {
    const grouped: Record<string, LaborIncidenceByRole[]> = {};
    groups?.forEach(g => { grouped[g.codigo] = []; });
    roleIncidences?.forEach(inc => {
      if (grouped[inc.group_codigo]) {
        grouped[inc.group_codigo].push(inc);
      }
    });
    return grouped;
  }, [roleIncidences, groups]);
  
  // Calculate role totals by group (only applicable items)
  const roleTotalsByGroup = useMemo(() => {
    const totals: Record<string, number> = {};
    groups?.forEach(g => {
      totals[g.codigo] = roleIncidencesByGroup[g.codigo]
        ?.filter(i => i.is_applicable_final)
        .reduce((sum, i) => sum + (i.custo_mensal_pessoa_final ?? 0), 0) ?? 0;
    });
    return totals;
  }, [roleIncidencesByGroup, groups]);
  
  // Calculate role total geral
  const roleTotalGeral = useMemo(() => {
    return Object.values(roleTotalsByGroup).reduce((sum, v) => sum + v, 0);
  }, [roleTotalsByGroup]);
  
  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  const handleApplyCampoTemplate = () => {
    if (selectedRoleId) {
      seedCampoDefaults.mutate();
    }
  };

  const handleOpenAddDialog = (group: LaborIncidenceGroup) => {
    setSelectedGroup(group);
    setAddDialogOpen(true);
  };

  const handleCreateItem = async (data: LaborIncidenceItemInsert) => {
    await createItem.mutateAsync(data);
    setAddDialogOpen(false);
    setSelectedGroup(null);
  };

  // Get all existing codes for validation
  const existingCodes = useMemo(() => {
    return catalogItems?.map(item => item.codigo) ?? [];
  }, [catalogItems]);

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

  // Get active totals based on view mode
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleApplyCampoTemplate}
                disabled={seedCampoDefaults.isPending}
                className="gap-2"
              >
                <Tent className={cn(
                  "h-4 w-4",
                  seedCampoDefaults.isPending && "animate-spin"
                )} />
                Aplicar Template Campo
              </Button>
            )}

            {selectedRoleId && roleTotalGeral > 0 && (
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg ml-auto">
                <span className="text-sm font-medium">Total Incidências/pessoa/mês:</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(roleTotalGeral)}</span>
              </div>
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
                <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
                  <TabsList className="grid grid-cols-5 w-fit">
                    {groups.map(group => (
                      <TabsTrigger key={group.codigo} value={group.codigo} className="gap-1 text-xs">
                        {GROUP_ICONS[group.codigo]}
                        {group.codigo}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <Button
                    size="sm"
                    onClick={() => {
                      const currentGroup = groups.find(g => g.codigo === activeTab);
                      if (currentGroup) handleOpenAddDialog(currentGroup);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Item [{activeTab}]
                  </Button>
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
                                    <div className="flex flex-col items-center gap-2">
                                      <span>Nenhum item cadastrado para este grupo.</span>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleOpenAddDialog(group)}
                                        className="gap-2"
                                      >
                                        <Plus className="h-4 w-4" />
                                        Adicionar primeiro item
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                <>
                                  {catalogByGroup[group.codigo]?.map(item => (
                                    <CatalogItemRow
                                      key={item.id}
                                      item={item}
                                      groupCode={group.codigo}
                                    />
                                  ))}
                                  {/* Add Item Row */}
                                  <TableRow className="hover:bg-muted/30">
                                    <TableCell colSpan={headers.monthsLabel ? 7 : 6} className="py-2">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleOpenAddDialog(group)}
                                        className="gap-2 text-muted-foreground hover:text-foreground w-full justify-start"
                                      >
                                        <Plus className="h-4 w-4" />
                                        Adicionar novo item ao grupo [{group.codigo}]
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                </>
                              )}
                            </TableBody>
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

          {viewMode === 'roles' && selectedRoleId && roleIncidencesLoading && (
            <Card className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-64 w-full" />
            </Card>
          )}

          {viewMode === 'roles' && selectedRoleId && !roleIncidencesLoading && (
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
                              <TableHead className="w-14 text-center text-xs">Aplicável</TableHead>
                              <TableHead className="w-14 text-center text-xs">Obrig.</TableHead>
                              <TableHead className="text-xs">Código</TableHead>
                              <TableHead className="text-xs">Descrição</TableHead>
                              <TableHead className="text-xs">Tipo</TableHead>
                              <TableHead className="text-xs">Qtd</TableHead>
                              <TableHead className="text-xs">R$ Unit</TableHead>
                              <TableHead className="text-xs">Meses</TableHead>
                              <TableHead className="text-xs text-right">Custo/Mês</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {roleIncidencesByGroup[group.codigo]?.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={11} className="p-6 text-center text-muted-foreground text-sm">
                                  Nenhum item de incidência encontrado para este grupo.
                                </TableCell>
                              </TableRow>
                            ) : (
                              roleIncidencesByGroup[group.codigo]?.map(item => (
                                <RoleIncidenceRow
                                  key={item.item_id}
                                  item={item}
                                  onToggleApplicable={(isApplicable) => toggleApplicable.mutate({ 
                                    itemId: item.item_id, 
                                    ruleId: item.rule_id,
                                    isApplicable 
                                  })}
                                  onToggleMandatory={(isMandatory) => toggleMandatory.mutate({ 
                                    itemId: item.item_id, 
                                    ruleId: item.rule_id,
                                    isMandatory 
                                  })}
                                  onUpdateOverride={(updates) => upsertRule.mutate({ 
                                    itemId: item.item_id, 
                                    ruleId: item.rule_id,
                                    updates 
                                  })}
                                  onReset={() => item.rule_id && resetRule.mutate(item.rule_id)}
                                  isUpdating={toggleApplicable.isPending || toggleMandatory.isPending || upsertRule.isPending}
                                />
                              ))
                            )}
                          </TableBody>
                          {roleIncidencesByGroup[group.codigo]?.length > 0 && (
                            <TableFooter>
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={8} className="text-right font-medium text-sm">
                                  Custo Mensal por Pessoa [{group.codigo}]:
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                  {formatCurrency(roleTotalsByGroup[group.codigo] ?? 0)}
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
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

      {/* Add Item Dialog */}
      <AddIncidenceItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        group={selectedGroup}
        existingCodes={existingCodes}
        onSubmit={handleCreateItem}
        isSubmitting={createItem.isPending}
      />
    </div>
  );
}
