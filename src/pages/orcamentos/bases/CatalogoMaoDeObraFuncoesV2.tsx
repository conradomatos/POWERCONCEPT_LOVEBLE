import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, Trash2, HardHat, Search, Filter, Upload, Download, X, 
  AlertCircle, Check, RefreshCw, ChevronDown, Tags as TagsIcon, DollarSign 
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBudgetLaborCatalog, type BudgetLaborCatalogItem, type BudgetLaborCatalogFormData } from '@/hooks/orcamentos/useBudgetLaborCatalog';
import { useBudgetLaborChargeSets } from '@/hooks/orcamentos/useBudgetLaborChargeSets';
import { useBudgetLaborGroups, useBudgetLaborCategories, useBudgetLaborTags } from '@/hooks/orcamentos/useBudgetLaborTaxonomy';
import { useBudgetLaborCatalogImport, type ImportRowStatus } from '@/hooks/orcamentos/useBudgetLaborCatalogImport';
import { useEffectiveMOPrices, usePricebooks, useMOPriceItems } from '@/hooks/orcamentos/usePricebook';
import { PriceContextSelector } from '@/components/orcamentos/bases/PriceContextSelector';
import { PriceOriginBadge } from '@/components/orcamentos/bases/PriceOriginBadge';
import { formatCurrency } from '@/lib/currency';
import { CurrencyInput } from '@/components/ui/currency-input';
import { cn } from '@/lib/utils';

// Grid columns configuration
const COLUMNS = [
  'codigo', 'nome', 'tipo_mo', 'regime', 'carga_horaria', 'salario_base', 
  'beneficios', 'periculosidade', 'encargos', 'hh_custo', 'valor_ref_hh', 'preco_efetivo', 'produtividade', 
  'prod_tipo', 'prod_unidade', 'grupo', 'categoria', 'tags'
] as const;

const COLUMN_HEADERS: Record<string, { label: string; width: string; editable: boolean }> = {
  codigo: { label: 'Código', width: 'min-w-[140px]', editable: true },
  nome: { label: 'Função', width: 'min-w-[200px]', editable: true },
  tipo_mo: { label: 'Tipo', width: 'w-24', editable: true },
  regime: { label: 'Regime', width: 'w-20', editable: true },
  carga_horaria: { label: 'CH/Mês', width: 'w-20', editable: true },
  salario_base: { label: 'Salário Base', width: 'w-32', editable: true },
  beneficios: { label: 'Benefícios', width: 'w-28', editable: true },
  periculosidade: { label: 'Peric. %', width: 'w-20', editable: true },
  encargos: { label: 'Encargos', width: 'min-w-[140px]', editable: true },
  hh_custo: { label: 'HH Custo', width: 'w-28', editable: false },
  valor_ref_hh: { label: 'Ref. R$/h', width: 'w-28', editable: true },
  preco_efetivo: { label: 'Preço Efetivo', width: 'w-36', editable: true },
  produtividade: { label: 'Produt.', width: 'w-24', editable: true },
  prod_tipo: { label: 'Tipo Prod.', width: 'w-28', editable: true },
  prod_unidade: { label: 'Un. Prod.', width: 'w-20', editable: true },
  grupo: { label: 'Grupo', width: 'min-w-[120px]', editable: true },
  categoria: { label: 'Categoria', width: 'min-w-[120px]', editable: true },
  tags: { label: 'Tags', width: 'min-w-[150px]', editable: true },
};

type CellPosition = { row: number; col: number };

// Tag Input Component
function TagInput({ 
  value, 
  allTags, 
  onChange,
  onCreateTag,
}: { 
  value: { id: string; nome: string }[];
  allTags: { id: string; nome: string }[];
  onChange: (tagIds: string[]) => void;
  onCreateTag: (nome: string) => Promise<string>;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const existing = allTags.find(t => t.nome.toLowerCase() === inputValue.toLowerCase());
      const tagId = existing ? existing.id : await onCreateTag(inputValue.trim());
      if (!value.find(t => t.id === tagId)) {
        onChange([...value.map(t => t.id), tagId]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1).map(t => t.id));
    }
  };

  const filteredTags = allTags.filter(
    t => t.nome.toLowerCase().includes(inputValue.toLowerCase()) && !value.find(v => v.id === t.id)
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 items-center min-h-[32px] p-1 border rounded-md bg-background">
        {value.map(tag => (
          <Badge key={tag.id} variant="secondary" className="text-xs h-5 gap-1">
            {tag.nome}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => onChange(value.filter(t => t.id !== tag.id).map(t => t.id))}
            />
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[60px] text-xs bg-transparent outline-none"
          placeholder={value.length === 0 ? 'Digitar...' : ''}
        />
      </div>
      {showDropdown && filteredTags.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-auto">
          {filteredTags.slice(0, 5).map(tag => (
            <div
              key={tag.id}
              className="px-2 py-1 text-xs hover:bg-muted cursor-pointer"
              onMouseDown={() => {
                onChange([...value.map(t => t.id), tag.id]);
                setInputValue('');
              }}
            >
              {tag.nome}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Import Modal
function ImportModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const {
    isProcessing,
    preview,
    summary,
    columnMapping,
    headers,
    processFile,
    applyImport,
    reset,
    updateMapping,
    downloadTemplate,
  } = useBudgetLaborCatalogImport();

  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
      setStep('preview');
    }
  };

  const handleClose = () => {
    reset();
    setStep('upload');
    onOpenChange(false);
  };

  const handleApply = async () => {
    const success = await applyImport();
    if (success) {
      handleClose();
      onSuccess();
    }
  };

  const getStatusBadge = (status: ImportRowStatus) => {
    const config = {
      NEW: { label: 'Novo', className: 'bg-green-100 text-green-800' },
      UPDATE: { label: 'Atualiza', className: 'bg-blue-100 text-blue-800' },
      EQUAL: { label: 'Igual', className: 'bg-gray-100 text-gray-600' },
      ERROR: { label: 'Erro', className: 'bg-red-100 text-red-800' },
    };
    const { label, className } = config[status];
    return <Badge variant="outline" className={cn('text-xs', className)}>{label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Funções de Mão de Obra
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' ? 'Selecione um arquivo XLSX para importar' : 'Revise os dados antes de aplicar'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Clique para selecionar ou arraste um arquivo</p>
              <p className="text-xs text-muted-foreground mt-1">Suporta XLSX e CSV</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>
        )}

        {step === 'preview' && summary && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Summary */}
            <div className="flex gap-4 flex-wrap">
              <div className="text-sm">
                <span className="font-medium">Total:</span> {summary.total}
              </div>
              <div className="text-sm text-green-600">
                <span className="font-medium">Novos:</span> {summary.new}
              </div>
              <div className="text-sm text-blue-600">
                <span className="font-medium">Atualizar:</span> {summary.update}
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium">Iguais:</span> {summary.equal}
              </div>
              {summary.error > 0 && (
                <div className="text-sm text-red-600">
                  <span className="font-medium">Erros:</span> {summary.error}
                </div>
              )}
            </div>

            {/* Column Mapping */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Mapeamento de colunas
              </summary>
              <div className="grid grid-cols-4 gap-2 mt-2 p-2 bg-muted/50 rounded">
                {Object.entries(COLUMN_ALIASES).slice(0, 8).map(([field]) => (
                  <div key={field} className="flex flex-col gap-1">
                    <label className="text-xs font-medium">{field}</label>
                    <Select
                      value={columnMapping[field] || ''}
                      onValueChange={(v) => updateMapping(field, v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </details>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Regime</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 100).map((row) => (
                    <TableRow key={row.rowIndex} className={row.status === 'ERROR' ? 'bg-red-50' : ''}>
                      <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="font-mono text-xs">{row.codigo}</TableCell>
                      <TableCell className="text-sm">{row.nome}</TableCell>
                      <TableCell>{row.tipo_mo}</TableCell>
                      <TableCell>{row.regime}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.salario_base)}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <ul className="text-xs">
                                {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <Button variant="outline" onClick={() => { reset(); setStep('upload'); }}>
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          {step === 'preview' && (
            <Button 
              onClick={handleApply} 
              disabled={isProcessing || (summary?.error || 0) > 0}
            >
              {isProcessing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Aplicar Importação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Aliases for import modal
const COLUMN_ALIASES: Record<string, string[]> = {
  codigo: ['codigo', 'código'],
  nome: ['nome', 'função'],
  tipo_mo: ['tipo_mo', 'tipo'],
  regime: ['regime'],
  salario_base: ['salario_base', 'salário'],
  encargos: ['encargos', 'charge_set'],
  grupo: ['grupo', 'group'],
  categoria: ['categoria', 'category'],
};

// Main Component
export default function CatalogoMaoDeObraFuncoesV2() {
  const { items, isLoading, createItem, updateItem, deleteItem, setItemTags } = useBudgetLaborCatalog();
  const { chargeSets } = useBudgetLaborChargeSets();
  const { groups, upsertGroup } = useBudgetLaborGroups();
  const { allCategories, upsertCategory } = useBudgetLaborCategories();
  const { tags, upsertTag } = useBudgetLaborTags();

  // Price context
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [regiaoId, setRegiaoId] = useState<string | null>(null);
  
  // Pricebooks
  const { pricebooks, globalPricebook, getOrCreatePricebook } = usePricebooks('MO');
  const activePricebook = useMemo(() => {
    // Find best matching pricebook for current context
    return pricebooks.find(p => p.empresa_id === empresaId && p.regiao_id === regiaoId)
      || pricebooks.find(p => p.empresa_id === empresaId && !p.regiao_id)
      || pricebooks.find(p => !p.empresa_id && p.regiao_id === regiaoId)
      || globalPricebook;
  }, [pricebooks, empresaId, regiaoId, globalPricebook]);
  
  const { upsertPrice: upsertMOPrice } = useMOPriceItems(activePricebook?.id);

  // Effective prices
  const funcaoIds = useMemo(() => items.map(i => i.id), [items]);
  const { data: effectivePrices = {} } = useEffectiveMOPrices(funcaoIds, empresaId, regiaoId);

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipoMo, setFilterTipoMo] = useState<string>('all');
  const [filterRegime, setFilterRegime] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);

  // Editing state
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // New row
  const [newItem, setNewItem] = useState<Partial<BudgetLaborCatalogFormData>>({
    codigo: '',
    nome: '',
    tipo_mo: 'MOD',
    regime: 'CLT',
    carga_horaria_mensal: 220,
    salario_base: 0,
  });

  // Filter items
  const filteredItems = items.filter(item => {
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        item.codigo.toLowerCase().includes(searchLower) ||
        item.nome.toLowerCase().includes(searchLower) ||
        item.tags?.some(t => t.nome.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    if (filterTipoMo !== 'all' && item.tipo_mo !== filterTipoMo) return false;
    if (filterRegime !== 'all' && item.regime !== filterRegime) return false;
    if (filterGroup !== 'all' && item.group_id !== filterGroup) return false;
    return true;
  });
  
  // Handle price update for context
  const handlePriceUpdate = async (funcaoId: string, newPrice: number) => {
    if (!activePricebook) {
      // Create pricebook for this context
      const pbId = await getOrCreatePricebook('MO', empresaId, regiaoId);
      await upsertMOPrice.mutateAsync({
        pricebook_id: pbId,
        funcao_id: funcaoId,
        hh_custo: newPrice,
        fonte: 'manual',
      });
    } else {
      await upsertMOPrice.mutateAsync({
        pricebook_id: activePricebook.id,
        funcao_id: funcaoId,
        hh_custo: newPrice,
        fonte: 'manual',
      });
    }
  };

  // Cell editing handlers
  const handleCellClick = (rowIdx: number, colIdx: number, currentValue: string) => {
    const col = COLUMNS[colIdx];
    if (!COLUMN_HEADERS[col].editable) return;
    setEditingCell({ row: rowIdx, col: colIdx });
    setEditValue(currentValue);
  };

  const handleCellBlur = async (item: BudgetLaborCatalogItem) => {
    if (!editingCell) return;
    
    const col = COLUMNS[editingCell.col];
    const updateData: Partial<BudgetLaborCatalogItem> = { id: item.id };

    switch (col) {
      case 'codigo':
        if (editValue !== item.codigo) updateData.codigo = editValue;
        break;
      case 'nome':
        if (editValue !== item.nome) updateData.nome = editValue;
        break;
      case 'tipo_mo':
        if (editValue !== item.tipo_mo) updateData.tipo_mo = editValue as 'MOD' | 'MOI';
        break;
      case 'regime':
        if (editValue !== item.regime) updateData.regime = editValue as 'CLT' | 'PL';
        break;
      case 'carga_horaria':
        const ch = parseFloat(editValue) || 220;
        if (ch !== item.carga_horaria_mensal) updateData.carga_horaria_mensal = ch;
        break;
      case 'salario_base':
        const sal = parseFloat(editValue.replace(',', '.')) || 0;
        if (sal !== item.salario_base) updateData.salario_base = sal;
        break;
      case 'beneficios':
        const ben = parseFloat(editValue.replace(',', '.')) || 0;
        if (ben !== item.beneficios_mensal) updateData.beneficios_mensal = ben;
        break;
      case 'periculosidade':
        const per = parseFloat(editValue.replace(',', '.')) || 0;
        if (per !== item.periculosidade_pct) updateData.periculosidade_pct = per;
        break;
      case 'encargos':
        if (editValue !== item.charge_set_id) updateData.charge_set_id = editValue || null;
        break;
      case 'valor_ref_hh':
        // NEW: valor_ref_hh - null if empty, otherwise parsed value
        const refHh = editValue.trim() !== '' ? parseFloat(editValue.replace(',', '.')) : null;
        if (refHh !== item.valor_ref_hh) updateData.valor_ref_hh = refHh;
        break;
      case 'produtividade':
        const prod = editValue ? parseFloat(editValue.replace(',', '.')) : null;
        if (prod !== item.produtividade_valor) updateData.produtividade_valor = prod;
        break;
      case 'prod_tipo':
        if (editValue !== item.produtividade_tipo) updateData.produtividade_tipo = editValue as 'HH_POR_UN' | 'UN_POR_HH';
        break;
      case 'prod_unidade':
        if (editValue !== (item.produtividade_unidade || '')) updateData.produtividade_unidade = editValue || null;
        break;
      case 'grupo':
        if (editValue && editValue !== item.group_id) {
          const groupId = await upsertGroup(editValue);
          updateData.group_id = groupId;
        } else if (!editValue && item.group_id) {
          updateData.group_id = null;
        }
        break;
      case 'categoria':
        if (editValue && editValue !== item.category_id) {
          const catId = await upsertCategory(editValue, item.group_id || undefined);
          updateData.category_id = catId;
        } else if (!editValue && item.category_id) {
          updateData.category_id = null;
        }
        break;
    }

    if (Object.keys(updateData).length > 1) {
      await updateItem.mutateAsync(updateData as any);
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: BudgetLaborCatalogItem, rowIdx: number) => {
    if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleCellBlur(item);
      
      // Move to next cell
      if (e.key === 'Tab' && editingCell) {
        const nextCol = e.shiftKey 
          ? Math.max(0, editingCell.col - 1)
          : Math.min(COLUMNS.length - 1, editingCell.col + 1);
        
        if (nextCol !== editingCell.col) {
          setTimeout(() => {
            const nextItem = filteredItems[rowIdx];
            if (nextItem) {
              const val = getCellValue(nextItem, COLUMNS[nextCol]);
              handleCellClick(rowIdx, nextCol, val);
            }
          }, 50);
        }
      }
    }
  };

  const getCellValue = (item: BudgetLaborCatalogItem, col: string): string => {
    switch (col) {
      case 'codigo': return item.codigo;
      case 'nome': return item.nome;
      case 'tipo_mo': return item.tipo_mo;
      case 'regime': return item.regime;
      case 'carga_horaria': return String(item.carga_horaria_mensal);
      case 'salario_base': return String(item.salario_base);
      case 'beneficios': return String(item.beneficios_mensal);
      case 'periculosidade': return String(item.periculosidade_pct);
      case 'encargos': return item.charge_set_id || '';
      case 'hh_custo': return String(item.hh_custo);
      case 'valor_ref_hh': return item.valor_ref_hh != null ? String(item.valor_ref_hh) : '';
      case 'produtividade': return item.produtividade_valor ? String(item.produtividade_valor) : '';
      case 'prod_tipo': return item.produtividade_tipo;
      case 'prod_unidade': return item.produtividade_unidade || '';
      case 'grupo': return item.group_nome || '';
      case 'categoria': return item.category_nome || '';
      case 'tags': return item.tags?.map(t => t.nome).join(', ') || '';
      default: return '';
    }
  };

  const renderCell = (item: BudgetLaborCatalogItem, col: string, rowIdx: number, colIdx: number) => {
    const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
    const cellConfig = COLUMN_HEADERS[col];

    // Special rendering for certain columns
    if (col === 'hh_custo') {
      return (
        <span className="font-medium text-primary">
          {formatCurrency(item.hh_custo)}/h
        </span>
      );
    }

    // NEW: valor_ref_hh column - reference hourly value (optional default)
    if (col === 'valor_ref_hh') {
      if (isEditing) {
        return (
          <Input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellBlur(item)}
            onKeyDown={(e) => handleKeyDown(e, item, rowIdx)}
            className="h-7 text-xs text-right"
            placeholder="R$/h"
            autoFocus
          />
        );
      }
      
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "font-mono text-xs cursor-pointer px-1 py-0.5 rounded",
              item.valor_ref_hh != null 
                ? "text-emerald-700 bg-emerald-50" 
                : "text-muted-foreground"
            )}>
              {item.valor_ref_hh != null ? `${formatCurrency(item.valor_ref_hh)}/h` : '—'}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {item.valor_ref_hh != null 
                ? "Padrão sugerido (referência para orçamentos)" 
                : "Sem valor de referência definido"}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    // Effective price column with context
    if (col === 'preco_efetivo') {
      const effectivePrice = effectivePrices[item.id];
      
      if (isEditing) {
        return (
          <Input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={async () => {
              const price = parseFloat(editValue.replace(',', '.')) || 0;
              await handlePriceUpdate(item.id, price);
              setEditingCell(null);
              setEditValue('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const price = parseFloat(editValue.replace(',', '.')) || 0;
                handlePriceUpdate(item.id, price);
                setEditingCell(null);
                setEditValue('');
              } else if (e.key === 'Escape') {
                setEditingCell(null);
                setEditValue('');
              }
            }}
            className="h-7 text-xs text-right"
            autoFocus
          />
        );
      }

      return (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs">
            {effectivePrice ? formatCurrency(effectivePrice.hh_custo) : '—'}
          </span>
          <PriceOriginBadge 
            origem={effectivePrice?.origem || null} 
            pricebookNome={effectivePrice?.pricebook_nome}
          />
        </div>
      );
    }

    if (col === 'tags') {
      return (
        <TagInput
          value={item.tags || []}
          allTags={tags}
          onChange={(tagIds) => setItemTags(item.id, tagIds)}
          onCreateTag={upsertTag}
        />
      );
    }

    if (col === 'tipo_mo') {
      if (isEditing) {
        return (
          <Select
            value={editValue}
            onValueChange={(v) => { setEditValue(v); }}
            onOpenChange={(open) => { if (!open) handleCellBlur(item); }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MOD">MOD</SelectItem>
              <SelectItem value="MOI">MOI</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      return (
        <Badge variant={item.tipo_mo === 'MOD' ? 'default' : 'secondary'} className="text-xs">
          {item.tipo_mo}
        </Badge>
      );
    }

    if (col === 'regime') {
      if (isEditing) {
        return (
          <Select
            value={editValue}
            onValueChange={(v) => { setEditValue(v); }}
            onOpenChange={(open) => { if (!open) handleCellBlur(item); }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLT">CLT</SelectItem>
              <SelectItem value="PL">PL</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      return <Badge variant="outline" className="text-xs">{item.regime}</Badge>;
    }

    if (col === 'encargos') {
      if (isEditing) {
        return (
          <Select
            value={editValue}
            onValueChange={(v) => { setEditValue(v); }}
            onOpenChange={(open) => { if (!open) handleCellBlur(item); }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {chargeSets.map(cs => (
                <SelectItem key={cs.id} value={cs.id}>
                  {cs.nome} ({cs.total_encargos_pct.toFixed(1)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      return item.charge_set_nome ? (
        <span className="text-xs">{item.charge_set_nome}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      );
    }

    if (col === 'prod_tipo') {
      if (isEditing) {
        return (
          <Select
            value={editValue}
            onValueChange={(v) => { setEditValue(v); }}
            onOpenChange={(open) => { if (!open) handleCellBlur(item); }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HH_POR_UN">HH/un</SelectItem>
              <SelectItem value="UN_POR_HH">un/HH</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      return <span className="text-xs">{item.produtividade_tipo === 'UN_POR_HH' ? 'un/HH' : 'HH/un'}</span>;
    }

    if (col === 'salario_base' || col === 'beneficios') {
      const value = col === 'salario_base' ? item.salario_base : item.beneficios_mensal;
      if (isEditing) {
        return (
          <Input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellBlur(item)}
            onKeyDown={(e) => handleKeyDown(e, item, rowIdx)}
            className="h-7 text-xs text-right"
            autoFocus
          />
        );
      }
      return <span className="text-right block">{formatCurrency(value)}</span>;
    }

    // Default text input
    if (isEditing) {
      return (
        <Input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellBlur(item)}
          onKeyDown={(e) => handleKeyDown(e, item, rowIdx)}
          className="h-7 text-xs"
          autoFocus
        />
      );
    }

    const displayValue = getCellValue(item, col);
    return <span className="text-xs truncate">{displayValue || '—'}</span>;
  };

  // Add new item
  const handleAddItem = async () => {
    if (!newItem.codigo || !newItem.nome) return;
    
    await createItem.mutateAsync({
      codigo: newItem.codigo,
      nome: newItem.nome,
      tipo_mo: newItem.tipo_mo || 'MOD',
      regime: newItem.regime || 'CLT',
      carga_horaria_mensal: newItem.carga_horaria_mensal || 220,
      salario_base: newItem.salario_base || 0,
    });

    setNewItem({
      codigo: '',
      nome: '',
      tipo_mo: 'MOD',
      regime: 'CLT',
      carga_horaria_mensal: 220,
      salario_base: 0,
    });
  };

  return (
    <TooltipProvider>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HardHat className="h-6 w-6" />
              Catálogo de Funções de MO
            </h1>
            <p className="text-muted-foreground">
              Base global de funções para orçamentos • {items.length} funções cadastradas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar XLSX
            </Button>
          </div>
        </div>

        {/* Price Context Selector */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>Contexto de Preços:</span>
          </div>
          <PriceContextSelector
            empresaId={empresaId}
            regiaoId={regiaoId}
            onEmpresaChange={setEmpresaId}
            onRegiaoChange={setRegiaoId}
          />
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nome ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            variant={showFilters ? 'secondary' : 'outline'} 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {(filterTipoMo !== 'all' || filterRegime !== 'all' || filterGroup !== 'all') && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                !
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Tipo MO</label>
              <Select value={filterTipoMo} onValueChange={setFilterTipoMo}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="MOD">MOD</SelectItem>
                  <SelectItem value="MOI">MOI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Regime</label>
              <Select value={filterRegime} onValueChange={setFilterRegime}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PL">PL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Grupo</label>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFilterTipoMo('all');
                setFilterRegime('all');
                setFilterGroup('all');
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}

        {/* Grid Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map(col => (
                      <TableHead 
                        key={col} 
                        className={cn(COLUMN_HEADERS[col].width, 'text-xs')}
                      >
                        {COLUMN_HEADERS[col].label}
                      </TableHead>
                    ))}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length + 1} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length + 1} className="text-center py-8 text-muted-foreground">
                        Nenhuma função encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, rowIdx) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        {COLUMNS.map((col, colIdx) => (
                          <TableCell
                            key={col}
                            className={cn(
                              COLUMN_HEADERS[col].width,
                              'p-1 cursor-pointer',
                              COLUMN_HEADERS[col].editable && 'hover:bg-muted'
                            )}
                            onClick={() => handleCellClick(rowIdx, colIdx, getCellValue(item, col))}
                          >
                            {renderCell(item, col, rowIdx, colIdx)}
                          </TableCell>
                        ))}
                        <TableCell className="p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deleteItem.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}

                  {/* New item row */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="p-1">
                      <Input
                        placeholder="Código"
                        value={newItem.codigo || ''}
                        onChange={(e) => setNewItem({ ...newItem, codigo: e.target.value })}
                        className="h-7 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        placeholder="Nome da função"
                        value={newItem.nome || ''}
                        onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                        className="h-7 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={newItem.tipo_mo}
                        onValueChange={(v) => setNewItem({ ...newItem, tipo_mo: v as 'MOD' | 'MOI' })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MOD">MOD</SelectItem>
                          <SelectItem value="MOI">MOI</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={newItem.regime}
                        onValueChange={(v) => setNewItem({ ...newItem, regime: v as 'CLT' | 'PL' })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLT">CLT</SelectItem>
                          <SelectItem value="PL">PL</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        value={newItem.carga_horaria_mensal || ''}
                        onChange={(e) => setNewItem({ ...newItem, carga_horaria_mensal: parseFloat(e.target.value) || 220 })}
                        className="h-7 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={newItem.salario_base || ''}
                        onChange={(e) => setNewItem({ ...newItem, salario_base: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell colSpan={COLUMNS.length - 6} className="p-1">
                      {/* Empty cells for remaining columns */}
                    </TableCell>
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleAddItem}
                        disabled={!newItem.codigo || !newItem.nome || createItem.isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Import Modal */}
        <ImportModal
          open={importOpen}
          onOpenChange={setImportOpen}
          onSuccess={() => {}}
        />
      </div>
    </TooltipProvider>
  );
}
