import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Search, X, ChevronDown, Filter, Factory } from 'lucide-react';
import { useMaterialCatalog, type CatalogItem, type CatalogFormData } from '@/hooks/orcamentos/useMaterialCatalog';
import { useMaterialGroups } from '@/hooks/orcamentos/useMaterialGroups';
import { useMaterialCategories } from '@/hooks/orcamentos/useMaterialCategories';
import { useMaterialSubcategories } from '@/hooks/orcamentos/useMaterialSubcategories';
import { useMaterialTags } from '@/hooks/orcamentos/useMaterialTags';
import { useAllMaterialVariants } from '@/hooks/orcamentos/useMaterialVariants';
import { MaterialVariantsDrawer } from './MaterialVariantsDrawer';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CellPosition {
  row: number;
  col: number;
}

const COLUMNS = ['codigo', 'descricao', 'unidade', 'hh_unit_ref', 'group_id', 'category_id', 'subcategory_id', 'tags', 'fabricantes'] as const;
type ColumnKey = typeof COLUMNS[number];

const COLUMN_HEADERS: Record<ColumnKey, { label: string; width: string; align?: 'right' }> = {
  codigo: { label: 'Código', width: 'w-28' },
  descricao: { label: 'Descrição', width: 'min-w-[200px]' },
  unidade: { label: 'Un', width: 'w-16' },
  hh_unit_ref: { label: 'HH Ref', width: 'w-24', align: 'right' },
  group_id: { label: 'Grupo', width: 'w-32' },
  category_id: { label: 'Categoria', width: 'w-32' },
  subcategory_id: { label: 'Subcategoria', width: 'w-32' },
  tags: { label: 'Tags', width: 'w-40' },
  fabricantes: { label: 'Fabricantes/Preços', width: 'w-40' },
};

interface TagInputProps {
  materialId: string;
  currentTags: { id: string; nome: string }[];
  allTags: { id: string; nome: string }[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreate: (nome: string) => Promise<string>;
}

function TagInput({ materialId, currentTags, allTags, onAdd, onRemove, onCreate }: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const availableTags = allTags.filter(t => !currentTags.some(ct => ct.id === t.id));

  const handleCreate = async () => {
    if (!inputValue.trim()) return;
    const newId = await onCreate(inputValue.trim());
    onAdd(newId);
    setInputValue('');
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap gap-1 items-center min-h-[28px]">
      {currentTags.map(tag => (
        <Badge key={tag.id} variant="secondary" className="text-xs h-5 gap-1">
          {tag.nome}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(tag.id);
            }}
          />
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-5 px-1 text-xs text-muted-foreground">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar ou criar..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                {inputValue.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={handleCreate}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Criar "{inputValue}"
                  </Button>
                )}
              </CommandEmpty>
              <CommandGroup>
                {availableTags
                  .filter(t => !inputValue || t.nome.toLowerCase().includes(inputValue.toLowerCase()))
                  .slice(0, 10)
                  .map(tag => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => {
                        onAdd(tag.id);
                        setOpen(false);
                      }}
                    >
                      {tag.nome}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MaterialCatalogGrid() {
  const { items, isLoading, createItem, updateItem, deleteItem } = useMaterialCatalog();
  const { groups } = useMaterialGroups();
  const { allCategories } = useMaterialCategories();
  const { allSubcategories } = useMaterialSubcategories();
  const { tags, upsertTag, addTagToMaterial, removeTagFromMaterial } = useMaterialTags();
  const { variantsMap } = useAllMaterialVariants();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroupId, setFilterGroupId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>('');
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Variants drawer state
  const [variantsDrawerOpen, setVariantsDrawerOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);

  const [newItem, setNewItem] = useState<CatalogFormData>({
    codigo: '',
    descricao: '',
    unidade: 'pç',
    hh_unit_ref: null,
    group_id: null,
    category_id: null,
    subcategory_id: null,
  });

  // Filtered categories/subcategories for cascading dropdowns
  const filteredCategoriesForFilter = useMemo(() => {
    if (!filterGroupId) return allCategories;
    return allCategories.filter(c => c.group_id === filterGroupId);
  }, [allCategories, filterGroupId]);

  const filteredSubcategoriesForFilter = useMemo(() => {
    if (!filterCategoryId) return allSubcategories;
    return allSubcategories.filter(s => s.category_id === filterCategoryId);
  }, [allSubcategories, filterCategoryId]);

  // New item cascading
  const categoriesForNewItem = useMemo(() => {
    if (!newItem.group_id) return [];
    return allCategories.filter(c => c.group_id === newItem.group_id);
  }, [allCategories, newItem.group_id]);

  const subcategoriesForNewItem = useMemo(() => {
    if (!newItem.category_id) return [];
    return allSubcategories.filter(s => s.category_id === newItem.category_id);
  }, [allSubcategories, newItem.category_id]);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.codigo.toLowerCase().includes(term) ||
        item.descricao.toLowerCase().includes(term) ||
        item.group?.nome?.toLowerCase().includes(term) ||
        item.category?.nome?.toLowerCase().includes(term) ||
        item.subcategory?.nome?.toLowerCase().includes(term)
      );
    }

    if (filterGroupId) {
      result = result.filter(item => item.group_id === filterGroupId);
    }

    if (filterCategoryId) {
      result = result.filter(item => item.category_id === filterCategoryId);
    }

    if (filterSubcategoryId) {
      result = result.filter(item => item.subcategory_id === filterSubcategoryId);
    }

    if (filterTagIds.length > 0) {
      result = result.filter(item =>
        filterTagIds.every(tagId => item.tags?.some(t => t.id === tagId))
      );
    }

    return result;
  }, [items, searchTerm, filterGroupId, filterCategoryId, filterSubcategoryId, filterTagIds]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Reset cascading filters when parent changes
  useEffect(() => {
    if (!filterGroupId) {
      setFilterCategoryId('');
      setFilterSubcategoryId('');
    }
  }, [filterGroupId]);

  useEffect(() => {
    if (!filterCategoryId) {
      setFilterSubcategoryId('');
    }
  }, [filterCategoryId]);

  const getCellValue = (item: CatalogItem, col: ColumnKey): string => {
    if (col === 'group_id') return item.group?.nome || '';
    if (col === 'category_id') return item.category?.nome || '';
    if (col === 'subcategory_id') return item.subcategory?.nome || '';
    if (col === 'tags') return item.tags?.map(t => t.nome).join(', ') || '';
    if (col === 'fabricantes') return '';
    const value = item[col as keyof CatalogItem];
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const startEditing = (rowIndex: number, colIndex: number, item: CatalogItem) => {
    const col = COLUMNS[colIndex];
    // Don't edit via text for dropdowns, tags, and fabricantes
    if (['group_id', 'category_id', 'subcategory_id', 'tags', 'fabricantes'].includes(col)) return;
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(getCellValue(item, col));
  };

  const commitEdit = async (item: CatalogItem) => {
    if (!editingCell) return;

    const col = COLUMNS[editingCell.col];
    let value: any = editValue.trim();

    if (col === 'hh_unit_ref') {
      value = value ? parseFloat(value.replace(',', '.')) : null;
      if (value !== null && isNaN(value)) value = null;
    }

    const currentValue = getCellValue(item, col);
    if (value !== currentValue) {
      await updateItem.mutateAsync({ id: item.id, [col]: value });
    }

    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: CatalogItem, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(item);
      if (rowIndex < filteredItems.length - 1) {
        const nextItem = filteredItems[rowIndex + 1];
        startEditing(rowIndex + 1, colIndex, nextItem);
      }
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit(item);
      const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;
      // Skip dropdown columns and fabricantes
      let targetCol = nextCol;
      while (['group_id', 'category_id', 'subcategory_id', 'tags', 'fabricantes'].includes(COLUMNS[targetCol]) && targetCol >= 0 && targetCol < COLUMNS.length) {
        targetCol = e.shiftKey ? targetCol - 1 : targetCol + 1;
      }
      if (targetCol >= 0 && targetCol < COLUMNS.length) {
        startEditing(rowIndex, targetCol, item);
      } else if (!e.shiftKey && rowIndex < filteredItems.length - 1) {
        const nextItem = filteredItems[rowIndex + 1];
        startEditing(rowIndex + 1, 0, nextItem);
      } else if (e.shiftKey && rowIndex > 0) {
        const prevItem = filteredItems[rowIndex - 1];
        startEditing(rowIndex - 1, 4, prevItem); // hh_unit_ref column
      }
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!editingCell) return;

    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split('\n').map(row => row.split('\t'));

    if (rows.length <= 1 && rows[0]?.length <= 1) return;

    e.preventDefault();

    const startRow = editingCell.row;
    const startCol = editingCell.col;

    for (let r = 0; r < rows.length; r++) {
      const targetRowIndex = startRow + r;
      if (targetRowIndex >= filteredItems.length) break;

      const item = filteredItems[targetRowIndex];
      const updates: Partial<CatalogItem> = { id: item.id };

      for (let c = 0; c < rows[r].length; c++) {
        const targetColIndex = startCol + c;
        if (targetColIndex >= COLUMNS.length) break;

        const col = COLUMNS[targetColIndex];
        // Skip dropdown columns and fabricantes when pasting
        if (['group_id', 'category_id', 'subcategory_id', 'tags', 'fabricantes'].includes(col)) continue;

        let value: any = rows[r][c]?.trim() || '';

        if (col === 'hh_unit_ref') {
          value = value ? parseFloat(value.replace(',', '.')) : null;
          if (value !== null && isNaN(value)) value = null;
        }

        (updates as any)[col] = value;
      }

      if (Object.keys(updates).length > 1) {
        await updateItem.mutateAsync(updates as any);
      }
    }

    cancelEdit();
  }, [editingCell, filteredItems, updateItem]);

  const handleAddItem = async () => {
    if (!newItem.codigo || !newItem.descricao) return;
    await createItem.mutateAsync(newItem);
    setNewItem({
      codigo: '',
      descricao: '',
      unidade: 'pç',
      hh_unit_ref: null,
      group_id: null,
      category_id: null,
      subcategory_id: null,
    });
  };

  const handleTagAdd = async (materialId: string, tagId: string) => {
    await addTagToMaterial(materialId, tagId);
  };

  const handleTagRemove = async (materialId: string, tagId: string) => {
    await removeTagFromMaterial(materialId, tagId);
  };

  const handleTagCreate = async (nome: string): Promise<string> => {
    return await upsertTag(nome);
  };

  const renderCell = (item: CatalogItem, rowIndex: number, colIndex: number) => {
    const col = COLUMNS[colIndex];
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;

    // Dropdown cells
    if (col === 'group_id') {
      return (
        <Select
          value={item.group_id || '__clear__'}
          onValueChange={async (value) => {
            await updateItem.mutateAsync({
              id: item.id,
              group_id: value === '__clear__' ? null : value,
              category_id: null,
              subcategory_id: null,
            });
          }}
        >
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">-</SelectItem>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (col === 'category_id') {
      const categoriesForItem = item.group_id
        ? allCategories.filter(c => c.group_id === item.group_id)
        : [];
      return (
        <Select
          value={item.category_id || '__clear__'}
          onValueChange={async (value) => {
            await updateItem.mutateAsync({
              id: item.id,
              category_id: value === '__clear__' ? null : value,
              subcategory_id: null,
            });
          }}
          disabled={!item.group_id}
        >
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">-</SelectItem>
            {categoriesForItem.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (col === 'subcategory_id') {
      const subcategoriesForItem = item.category_id
        ? allSubcategories.filter(s => s.category_id === item.category_id)
        : [];
      return (
        <Select
          value={item.subcategory_id || '__clear__'}
          onValueChange={async (value) => {
            await updateItem.mutateAsync({
              id: item.id,
              subcategory_id: value === '__clear__' ? null : value,
            });
          }}
          disabled={!item.category_id}
        >
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">-</SelectItem>
            {subcategoriesForItem.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (col === 'tags') {
      return (
        <TagInput
          materialId={item.id}
          currentTags={item.tags || []}
          allTags={tags}
          onAdd={(tagId) => handleTagAdd(item.id, tagId)}
          onRemove={(tagId) => handleTagRemove(item.id, tagId)}
          onCreate={handleTagCreate}
        />
      );
    }

    // Fabricantes column - show badge with count and open drawer
    if (col === 'fabricantes') {
      const variants = variantsMap.get(item.id) || [];
      const minPrice = variants.length > 0 ? Math.min(...variants.map(v => v.preco_ref)) : null;
      
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => {
                setSelectedCatalogItem(item);
                setVariantsDrawerOpen(true);
              }}
            >
              <Factory className="h-3 w-3" />
              {variants.length > 0 ? (
                <>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {variants.length}
                  </Badge>
                  <span className="text-muted-foreground font-mono">
                    {formatCurrency(minPrice!).replace('R$ ', '')}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">+</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {variants.length > 0 
              ? `${variants.length} fabricante(s) - clique para gerenciar` 
              : 'Clique para adicionar fabricante'}
          </TooltipContent>
        </Tooltip>
      );
    }

    // Text cells
    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => commitEdit(item)}
          onKeyDown={(e) => handleKeyDown(e, item, rowIndex, colIndex)}
          onPaste={handlePaste}
          className={cn(
            'h-7 text-xs px-2',
            COLUMN_HEADERS[col].align === 'right' && 'text-right'
          )}
        />
      );
    }

    const value = item[col as keyof CatalogItem];
    let displayValue: string = '-';
    if (col === 'hh_unit_ref') {
      displayValue = value !== null && value !== undefined ? formatCurrency(value as number).replace('R$ ', '') : '-';
    } else if (typeof value === 'string') {
      displayValue = value || '-';
    }

    return (
      <div
        className={cn(
          'h-7 px-2 flex items-center cursor-pointer hover:bg-muted/50 rounded text-xs',
          COLUMN_HEADERS[col].align === 'right' && 'justify-end font-mono'
        )}
        onClick={() => startEditing(rowIndex, colIndex, item)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            startEditing(rowIndex, colIndex, item);
          }
        }}
      >
        {displayValue}
      </div>
    );
  };

  const hasFilters = filterGroupId || filterCategoryId || filterSubcategoryId || filterTagIds.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Carregando catálogo...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters || hasFilters ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasFilters && (
            <Badge variant="default" className="ml-2 h-5 px-1.5">
              {[filterGroupId, filterCategoryId, filterSubcategoryId].filter(Boolean).length + filterTagIds.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border">
          <div className="w-40">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Grupo</label>
            <Select value={filterGroupId || '__all__'} onValueChange={(v) => setFilterGroupId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
            <Select value={filterCategoryId || '__all__'} onValueChange={(v) => setFilterCategoryId(v === '__all__' ? '' : v)} disabled={!filterGroupId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {filteredCategoriesForFilter.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Subcategoria</label>
            <Select value={filterSubcategoryId || '__all__'} onValueChange={(v) => setFilterSubcategoryId(v === '__all__' ? '' : v)} disabled={!filterCategoryId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {filteredSubcategoriesForFilter.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
            <div className="flex flex-wrap gap-1 items-center min-h-[32px] p-1 border rounded-md bg-background">
              {filterTagIds.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <Badge key={tagId} variant="secondary" className="text-xs h-5 gap-1">
                    {tag.nome}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setFilterTagIds(filterTagIds.filter(id => id !== tagId))}
                    />
                  </Badge>
                ) : null;
              })}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 px-1 text-xs text-muted-foreground">
                    <Plus className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar tag..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma tag</CommandEmpty>
                      <CommandGroup>
                        {tags
                          .filter(t => !filterTagIds.includes(t.id))
                          .map(tag => (
                            <CommandItem
                              key={tag.id}
                              onSelect={() => setFilterTagIds([...filterTagIds, tag.id])}
                            >
                              {tag.nome}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="self-end"
              onClick={() => {
                setFilterGroupId('');
                setFilterCategoryId('');
                setFilterSubcategoryId('');
                setFilterTagIds([]);
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredItems.length} itens</span>
        {(searchTerm || hasFilters) && <Badge variant="secondary">Filtrado</Badge>}
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col}
                    className={cn(
                      'px-3 py-2 font-medium text-muted-foreground',
                      COLUMN_HEADERS[col].width,
                      COLUMN_HEADERS[col].align === 'right' ? 'text-right' : 'text-left'
                    )}
                  >
                    {COLUMN_HEADERS[col].label}
                  </th>
                ))}
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-center py-8 text-muted-foreground">
                    {searchTerm || hasFilters ? 'Nenhum item encontrado' : 'Nenhum material cadastrado'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, rowIndex) => (
                  <tr key={item.id} className="border-t hover:bg-muted/20">
                    {COLUMNS.map((col, colIndex) => (
                      <td key={col} className="px-1 py-0.5">
                        {renderCell(item, rowIndex, colIndex)}
                      </td>
                    ))}
                    <td className="px-1 py-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItem.mutate(item.id)}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}

              {/* New item row */}
              <tr className="border-t bg-muted/30">
                <td className="px-1 py-1">
                  <Input
                    placeholder="Código"
                    value={newItem.codigo}
                    onChange={(e) => setNewItem({ ...newItem, codigo: e.target.value })}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    placeholder="Descrição do material"
                    value={newItem.descricao}
                    onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    value={newItem.unidade}
                    onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
                    className="h-7 text-xs w-14"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newItem.hh_unit_ref ?? ''}
                    onChange={(e) => setNewItem({ ...newItem, hh_unit_ref: parseFloat(e.target.value) || null })}
                    className="h-7 text-xs text-right"
                  />
                </td>
                <td className="px-1 py-1">
                  <Select
                    value={newItem.group_id || '__clear__'}
                    onValueChange={(value) => setNewItem({ ...newItem, group_id: value === '__clear__' ? null : value, category_id: null, subcategory_id: null })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">-</SelectItem>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1">
                  <Select
                    value={newItem.category_id || '__clear__'}
                    onValueChange={(value) => setNewItem({ ...newItem, category_id: value === '__clear__' ? null : value, subcategory_id: null })}
                    disabled={!newItem.group_id}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">-</SelectItem>
                      {categoriesForNewItem.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1">
                  <Select
                    value={newItem.subcategory_id || '__clear__'}
                    onValueChange={(value) => setNewItem({ ...newItem, subcategory_id: value === '__clear__' ? null : value })}
                    disabled={!newItem.category_id}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">-</SelectItem>
                      {subcategoriesForNewItem.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1 text-xs text-muted-foreground">
                  -
                </td>
                <td className="px-1 py-1 text-xs text-muted-foreground">
                  -
                </td>
                <td className="px-1 py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAddItem}
                    disabled={!newItem.codigo || !newItem.descricao || createItem.isPending}
                    className="h-7 w-7"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Dica: Clique em uma célula para editar. Use Tab/Enter para navegar. Clique em Fabricantes para gerenciar preços.
      </p>

      {/* Variants Drawer */}
      <MaterialVariantsDrawer
        open={variantsDrawerOpen}
        onOpenChange={setVariantsDrawerOpen}
        catalogId={selectedCatalogItem?.id || null}
        catalogCodigo={selectedCatalogItem?.codigo || ''}
        catalogDescricao={selectedCatalogItem?.descricao || ''}
      />
    </div>
  );
}
