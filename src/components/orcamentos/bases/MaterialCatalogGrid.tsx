import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Search } from 'lucide-react';
import { useMaterialCatalog, type CatalogItem, type CatalogFormData } from '@/hooks/orcamentos/useMaterialCatalog';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface CellPosition {
  row: number;
  col: number;
}

const COLUMNS = ['codigo', 'descricao', 'unidade', 'preco_ref', 'hh_unit_ref', 'categoria'] as const;
type ColumnKey = typeof COLUMNS[number];

export function MaterialCatalogGrid() {
  const { items, isLoading, createItem, updateItem, deleteItem } = useMaterialCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<CatalogFormData>({
    codigo: '',
    descricao: '',
    unidade: 'pç',
    preco_ref: null,
    hh_unit_ref: null,
    categoria: null,
  });

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.codigo.toLowerCase().includes(term) ||
      item.descricao.toLowerCase().includes(term) ||
      (item.categoria?.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const getCellValue = (item: CatalogItem, col: ColumnKey): string => {
    const value = item[col];
    if (value === null || value === undefined) return '';
    if (col === 'preco_ref' || col === 'hh_unit_ref') {
      return String(value);
    }
    return String(value);
  };

  const startEditing = (rowIndex: number, colIndex: number, item: CatalogItem) => {
    const col = COLUMNS[colIndex];
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(getCellValue(item, col));
  };

  const commitEdit = async (item: CatalogItem) => {
    if (!editingCell) return;
    
    const col = COLUMNS[editingCell.col];
    let value: any = editValue.trim();

    if (col === 'preco_ref' || col === 'hh_unit_ref') {
      value = value ? parseFloat(value.replace(',', '.')) : null;
      if (value !== null && isNaN(value)) value = null;
    } else if (col === 'categoria') {
      value = value || null;
    }

    const currentValue = item[col];
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
      // Move to next row
      if (rowIndex < filteredItems.length - 1) {
        const nextItem = filteredItems[rowIndex + 1];
        startEditing(rowIndex + 1, colIndex, nextItem);
      }
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit(item);
      // Move to next column or next row
      const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;
      if (nextCol >= 0 && nextCol < COLUMNS.length) {
        startEditing(rowIndex, nextCol, item);
      } else if (!e.shiftKey && rowIndex < filteredItems.length - 1) {
        const nextItem = filteredItems[rowIndex + 1];
        startEditing(rowIndex + 1, 0, nextItem);
      } else if (e.shiftKey && rowIndex > 0) {
        const prevItem = filteredItems[rowIndex - 1];
        startEditing(rowIndex - 1, COLUMNS.length - 1, prevItem);
      }
    } else if (e.key === 'ArrowDown' && !editingCell) {
      e.preventDefault();
      if (rowIndex < filteredItems.length - 1) {
        const nextItem = filteredItems[rowIndex + 1];
        startEditing(rowIndex + 1, colIndex, nextItem);
      }
    } else if (e.key === 'ArrowUp' && !editingCell) {
      e.preventDefault();
      if (rowIndex > 0) {
        const prevItem = filteredItems[rowIndex - 1];
        startEditing(rowIndex - 1, colIndex, prevItem);
      }
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!editingCell) return;
    
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split('\n').map(row => row.split('\t'));
    
    if (rows.length <= 1 && rows[0]?.length <= 1) {
      // Single cell paste, let default behavior handle it
      return;
    }

    e.preventDefault();

    // Multi-cell paste
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
        let value: any = rows[r][c]?.trim() || '';

        if (col === 'preco_ref' || col === 'hh_unit_ref') {
          value = value ? parseFloat(value.replace(',', '.')) : null;
          if (value !== null && isNaN(value)) value = null;
        } else if (col === 'categoria') {
          value = value || null;
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
    setNewItem({ codigo: '', descricao: '', unidade: 'pç', preco_ref: null, hh_unit_ref: null, categoria: null });
  };

  const renderCell = (item: CatalogItem, rowIndex: number, colIndex: number) => {
    const col = COLUMNS[colIndex];
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;

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
            (col === 'preco_ref' || col === 'hh_unit_ref') && 'text-right'
          )}
        />
      );
    }

    const value = item[col];
    const displayValue = col === 'preco_ref' || col === 'hh_unit_ref'
      ? (value !== null ? formatCurrency(value as number).replace('R$ ', '') : '-')
      : (value || '-');

    return (
      <div
        className={cn(
          'h-7 px-2 flex items-center cursor-pointer hover:bg-muted/50 rounded text-xs',
          (col === 'preco_ref' || col === 'hh_unit_ref') && 'justify-end font-mono'
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Carregando catálogo...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, descrição ou categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredItems.length} itens</span>
        {searchTerm && <Badge variant="secondary">Filtrado</Badge>}
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Código</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[200px]">Descrição</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">Un</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-28">Preço Ref</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">HH Ref</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Categoria</th>
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum item encontrado' : 'Nenhum material cadastrado'}
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
                    value={newItem.preco_ref ?? ''}
                    onChange={(e) => setNewItem({ ...newItem, preco_ref: parseFloat(e.target.value) || null })}
                    className="h-7 text-xs text-right"
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
                  <Input
                    placeholder="Categoria"
                    value={newItem.categoria ?? ''}
                    onChange={(e) => setNewItem({ ...newItem, categoria: e.target.value || null })}
                    className="h-7 text-xs"
                  />
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
        💡 Dica: Clique em uma célula para editar. Use Tab/Enter para navegar. Suporte a colar do Excel.
      </p>
    </div>
  );
}
