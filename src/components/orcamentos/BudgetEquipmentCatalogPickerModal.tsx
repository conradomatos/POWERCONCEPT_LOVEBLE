import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Package, Loader2, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import {
  useEquipmentCatalogNew,
  useEquipmentGroups,
  useEquipmentCategories,
  useEquipmentSubcategories,
  useEquipmentTags,
  type EquipmentCatalogItem,
} from '@/hooks/orcamentos/useEquipmentCatalogNew';

interface BudgetEquipmentCatalogPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (items: EquipmentCatalogItem[]) => Promise<void>;
  isAdding?: boolean;
}

export function BudgetEquipmentCatalogPickerModal({
  open,
  onOpenChange,
  onConfirm,
  isAdding = false,
}: BudgetEquipmentCatalogPickerModalProps) {
  const { items: catalogItems, isLoading: catalogLoading } = useEquipmentCatalogNew();
  const { groups } = useEquipmentGroups();
  const { categories } = useEquipmentCategories();
  const { subcategories } = useEquipmentSubcategories();
  const { tags } = useEquipmentTags();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('all');
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Filter categories by group
  const filteredCategories = useMemo(() => {
    if (selectedGroupId === 'all') return categories;
    return categories.filter(c => c.group_id === selectedGroupId);
  }, [categories, selectedGroupId]);

  // Filter subcategories by category
  const filteredSubcategories = useMemo(() => {
    if (selectedCategoryId === 'all') return subcategories;
    return subcategories.filter(s => s.category_id === selectedCategoryId);
  }, [subcategories, selectedCategoryId]);

  // Filter catalog items
  const filteredItems = useMemo(() => {
    return catalogItems.filter(item => {
      if (!item.ativo) return false;

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.codigo.toLowerCase().includes(term) ||
          item.descricao.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Group filter
      if (selectedGroupId !== 'all' && item.group_id !== selectedGroupId) return false;

      // Category filter
      if (selectedCategoryId !== 'all' && item.category_id !== selectedCategoryId) return false;

      // Subcategory filter
      if (selectedSubcategoryId !== 'all' && item.subcategory_id !== selectedSubcategoryId) return false;

      // Tag filter
      if (selectedTagId !== 'all') {
        const tag = tags.find(t => t.id === selectedTagId);
        if (tag && (!item.tags || !item.tags.includes(tag.nome))) return false;
      }

      return true;
    });
  }, [catalogItems, searchTerm, selectedGroupId, selectedCategoryId, selectedSubcategoryId, selectedTagId, tags]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleConfirm = async () => {
    const itemsToAdd = catalogItems.filter(item => selectedItems.has(item.id));
    await onConfirm(itemsToAdd);
    setSelectedItems(new Set());
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedItems(new Set());
    setSearchTerm('');
    setSelectedGroupId('all');
    setSelectedCategoryId('all');
    setSelectedSubcategoryId('all');
    setSelectedTagId('all');
    onOpenChange(false);
  };

  // Reset dependent filters when parent changes
  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value);
    setSelectedCategoryId('all');
    setSelectedSubcategoryId('all');
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value);
    setSelectedSubcategoryId('all');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Equipamentos do Catálogo
          </DialogTitle>
          <DialogDescription>
            Selecione os equipamentos que deseja adicionar ao orçamento
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Group */}
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger>
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {filteredCategories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subcategory */}
          <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Subcategoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as subcategorias</SelectItem>
              {filteredSubcategories.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags filter */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Tags:</span>
            <Badge
              variant={selectedTagId === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTagId('all')}
            >
              Todas
            </Badge>
            {tags.map(tag => (
              <Badge
                key={tag.id}
                variant={selectedTagId === tag.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedTagId(tag.id)}
              >
                {tag.nome}
              </Badge>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-hidden border rounded-md">
          <ScrollArea className="h-[350px]">
            {catalogLoading ? (
              <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                <Package className="h-12 w-12 mb-2 opacity-50" />
                <p>Nenhum equipamento encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-32">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-24">Unidade</TableHead>
                    <TableHead className="w-32 text-right">Preço Ref.</TableHead>
                    <TableHead className="w-40">Hierarquia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isSelected = selectedItems.has(item.id);
                    return (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                        onClick={() => handleToggleItem(item.id)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="text-muted-foreground">{item.unidade}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.preco_mensal_ref)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.hierarquia_path || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedItems.size > 0 ? (
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-primary" />
                {selectedItems.size} item(s) selecionado(s)
              </span>
            ) : (
              <span>{filteredItems.length} item(s) disponível(is)</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedItems.size === 0 || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>Adicionar {selectedItems.size > 0 && `(${selectedItems.size})`}</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
