import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  HardHat, 
  RotateCcw, 
  AlertCircle, 
  Info, 
  Shirt, 
  Shield, 
  Utensils, 
  Heart,
  FileText,
  RefreshCw,
  Search
} from 'lucide-react';
import { useBudgetLaborCatalog } from '@/hooks/orcamentos/useBudgetLaborCatalog';
import { useLaborIncidenceGroups, useLaborIncidenceItems } from '@/hooks/orcamentos/useLaborIncidenceCatalog';
import { useLaborRoleIncidences, LaborRoleIncidenceCost } from '@/hooks/orcamentos/useLaborRoleIncidences';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

const GROUP_ICONS: Record<string, React.ReactNode> = {
  'A': <FileText className="h-4 w-4" />,
  'B': <Shirt className="h-4 w-4" />,
  'C': <Shield className="h-4 w-4" />,
  'D': <Utensils className="h-4 w-4" />,
  'E': <Heart className="h-4 w-4" />,
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
    <tr className={cn(
      "border-b transition-colors",
      !item.ativo && "opacity-50 bg-muted/30"
    )}>
      {/* Checkbox */}
      <td className="p-2 w-10">
        <Checkbox 
          checked={item.ativo}
          onCheckedChange={(checked) => onToggle(!!checked)}
          disabled={isUpdating}
        />
      </td>
      
      {/* Código */}
      <td className="p-2 w-16">
        <Badge variant="outline" className="font-mono text-xs">
          {item.item_codigo}
        </Badge>
      </td>
      
      {/* Descrição */}
      <td className="p-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{item.item_descricao}</span>
          {item.obrigatorio && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0">
              Obrig.
            </Badge>
          )}
        </div>
      </td>
      
      {/* Tipo */}
      <td className="p-2 w-24">
        <Badge variant="secondary" className="text-[10px]">
          {isRateio ? 'Rateio' : 'Mensal'}
        </Badge>
      </td>
      
      {/* Qtd */}
      <td className="p-2 w-20">
        {isRateio ? (
          <Input
            type="number"
            value={item.qtd ?? ''}
            onChange={(e) => onUpdate({ qtd_override: e.target.value ? Number(e.target.value) : null })}
            disabled={!item.ativo || isUpdating}
            className={cn(
              "h-8 text-sm w-16",
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
              "h-8 text-sm w-16",
              item.has_qtd_mes_override && "border-primary"
            )}
            placeholder={catalogItem?.qtd_mes_default?.toString() ?? '-'}
          />
        )}
      </td>
      
      {/* Preço Unit */}
      <td className="p-2 w-24">
        {(isRateio || (!item.valor_mensal && item.calc_tipo === 'MENSAL')) && (
          <Input
            type="number"
            step="0.01"
            value={item.preco_unitario ?? ''}
            onChange={(e) => onUpdate({ preco_unitario_override: e.target.value ? Number(e.target.value) : null })}
            disabled={!item.ativo || isUpdating}
            className={cn(
              "h-8 text-sm w-20",
              item.has_preco_override && "border-primary"
            )}
            placeholder={catalogItem?.preco_unitario_default?.toString() ?? '-'}
          />
        )}
      </td>
      
      {/* Meses/Vida útil (only for RATEIO) */}
      <td className="p-2 w-20">
        {isRateio ? (
          <Input
            type="number"
            value={item.meses ?? ''}
            onChange={(e) => onUpdate({ meses_override: e.target.value ? Number(e.target.value) : null })}
            disabled={!item.ativo || isUpdating}
            className={cn(
              "h-8 text-sm w-16",
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
              "h-8 text-sm w-20",
              item.has_valor_mensal_override && "border-primary"
            )}
            placeholder={catalogItem?.valor_mensal_default?.toString() ?? '-'}
          />
        )}
      </td>
      
      {/* Custo Mensal (calculated) */}
      <td className="p-2 w-28 text-right">
        <span className={cn(
          "font-medium text-sm",
          item.ativo && item.custo_mensal_por_pessoa > 0 && "text-primary"
        )}>
          {formatCurrency(item.custo_mensal_por_pessoa)}
        </span>
      </td>
      
      {/* Actions */}
      <td className="p-2 w-12">
        {hasAnyOverride && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={onReset}
                disabled={isUpdating}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resetar para padrão do catálogo</TooltipContent>
          </Tooltip>
        )}
      </td>
    </tr>
  );
}

export default function IncidenciasMO() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [activeTab, setActiveTab] = useState('A');
  
  // Fetch data
  const { items: roles, isLoading: rolesLoading } = useBudgetLaborCatalog();
  const { data: groups } = useLaborIncidenceGroups();
  const { data: catalogItems } = useLaborIncidenceItems();
  const { 
    incidences, 
    totals, 
    isLoading: incidencesLoading, 
    toggleItem, 
    updateOverride, 
    resetOverrides,
    applyAllCatalogItems 
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
  
  // Calculate totals
  const totalGeral = useMemo(() => {
    return incidences
      .filter(i => i.ativo)
      .reduce((sum, i) => sum + (i.custo_mensal_por_pessoa ?? 0), 0);
  }, [incidences]);
  
  const selectedRole = roles?.find(r => r.id === selectedRoleId);
  
  // Handle applying all catalog items when a role is selected
  const handleRoleSelect = async (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  const handleApplyCatalog = () => {
    if (selectedRoleId) {
      applyAllCatalogItems.mutate();
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6 text-orange-500" />
            Incidências por Função (EPIs, Benefícios, etc.)
          </h1>
          <p className="text-muted-foreground">
            Configure itens de incidência (A–E) por função de mão de obra. Custo mensal por pessoa.
          </p>
        </div>
      </div>
      
      {/* Role Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecione uma Função</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou nome..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedRoleId ?? ''} onValueChange={handleRoleSelect}>
              <SelectTrigger className="w-96">
                <SelectValue placeholder="Selecione uma função de MO" />
              </SelectTrigger>
              <SelectContent>
                {filteredRoles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    <span className="font-mono text-xs mr-2">{role.codigo}</span>
                    {role.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRoleId && (
              <Button 
                variant="outline" 
                onClick={handleApplyCatalog}
                disabled={applyAllCatalogItems.isPending}
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  applyAllCatalogItems.isPending && "animate-spin"
                )} />
                Aplicar Catálogo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Content */}
      {!selectedRoleId ? (
        <Card className="p-8 text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione uma função para configurar as incidências.</p>
        </Card>
      ) : incidencesLoading ? (
        <Card className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </Card>
      ) : (
        <>
          {/* Summary Cards - using design tokens */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {groups?.map(group => {
              const groupTotal = incidencesByGroup[group.codigo]
                ?.filter(i => i.ativo)
                .reduce((sum, i) => sum + (i.custo_mensal_por_pessoa ?? 0), 0) ?? 0;
              
              return (
                <Card 
                  key={group.codigo}
                  className={cn(
                    "cursor-pointer transition-all",
                    activeTab === group.codigo && "ring-2 ring-primary"
                  )}
                  onClick={() => setActiveTab(group.codigo)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {GROUP_ICONS[group.codigo]}
                      <span className="font-medium text-sm">{group.codigo}</span>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(groupTotal)}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {group.nome}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {/* Total Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">TOTAL</span>
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(totalGeral)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  /pessoa/mês
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tabs with Items */}
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-0">
                <TabsList className="grid grid-cols-5 w-fit">
                  {groups?.map(group => (
                    <TabsTrigger key={group.codigo} value={group.codigo} className="gap-1">
                      {GROUP_ICONS[group.codigo]}
                      {group.codigo}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">
                {groups?.map(group => (
                  <TabsContent key={group.codigo} value={group.codigo} className="m-0">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-2 text-left w-10"></th>
                            <th className="p-2 text-left text-xs font-medium">Código</th>
                            <th className="p-2 text-left text-xs font-medium">Descrição</th>
                            <th className="p-2 text-left text-xs font-medium">Tipo</th>
                            <th className="p-2 text-left text-xs font-medium">
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  Qtd
                                  <Info className="h-3 w-3" />
                                </TooltipTrigger>
                                <TooltipContent>Quantidade ou dias/mês</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="p-2 text-left text-xs font-medium">R$ Unit</th>
                            <th className="p-2 text-left text-xs font-medium">
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  Meses/R$ Mensal
                                  <Info className="h-3 w-3" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Rateio: vida útil em meses | Mensal: valor fixo mensal
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="p-2 text-right text-xs font-medium">Custo/Mês</th>
                            <th className="p-2 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {incidencesByGroup[group.codigo]?.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                Clique em "Aplicar Catálogo" para adicionar itens do catálogo global.
                              </td>
                            </tr>
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
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Group Footer */}
                    <div className="mt-4 flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">{group.nome}</span>
                      <span className="text-lg font-bold text-primary">
                        Subtotal: {formatCurrency(
                          incidencesByGroup[group.codigo]
                            ?.filter(i => i.ativo)
                            .reduce((sum, i) => sum + (i.custo_mensal_por_pessoa ?? 0), 0) ?? 0
                        )}
                      </span>
                    </div>
                  </TabsContent>
                ))}
              </CardContent>
            </Tabs>
          </Card>
          
          {/* Function Info */}
          {selectedRole && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Função selecionada:</span>
                    <div className="font-medium">
                      <Badge variant="outline" className="font-mono mr-2">{selectedRole.codigo}</Badge>
                      {selectedRole.nome}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Total Incidências por Pessoa/Mês:</span>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
