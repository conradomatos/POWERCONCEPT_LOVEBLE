import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from '@/components/ui/table';
import { ArrowUp, ArrowDown, ChevronsUpDown, Search } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
  getValue?: (row: T) => string | number | null;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchKeys?: string[];
  totalLabel?: string;
  totalValue?: number;
  pageSize?: number;
  rowClassName?: (row: T, index: number) => string;
}

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ValueCell({ value }: { value: number }) {
  return (
    <span className={value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : ''}>
      {formatBRL(value)}
    </span>
  );
}

export function formatDateBR(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('pt-BR');
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKeys,
  totalLabel,
  totalValue,
  pageSize = 50,
  rowClassName,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const handleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    const keys = searchKeys || columns.map(c => c.key);
    return data.filter(row =>
      keys.some(k => {
        const v = row[k];
        if (v == null) return false;
        return String(v).toLowerCase().includes(lower);
      })
    );
  }, [data, search, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    return [...filtered].sort((a, b) => {
      const aVal = col?.getValue ? col.getValue(a) : a[sortKey];
      const bVal = col?.getValue ? col.getValue(b) : b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal), 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const alignClass = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={e => { setSearch(e.target.value); setVisibleCount(pageSize); }}
          className="pl-9 h-8 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border/50 max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead
                  key={col.key}
                  className={`${alignClass(col.align)} ${col.sortable !== false ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && (
                      sortKey === col.key
                        ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                        : <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row, i) => (
                <TableRow key={i} className={rowClassName?.(row, i)}>
                  {columns.map(col => (
                    <TableCell key={col.key} className={alignClass(col.align)}>
                      {col.render ? col.render(row, i) : (row[col.key] != null ? String(row[col.key]) : '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {(totalLabel || totalValue != null) && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={columns.length - 1} className="font-semibold text-xs">
                  {totalLabel || 'Total'}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {totalValue != null && <ValueCell value={totalValue} />}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Footer info + load more */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Mostrando {visible.length} de {sorted.length} lançamentos</span>
        {hasMore && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setVisibleCount(c => c + pageSize)}>
            Carregar mais ({Math.min(pageSize, sorted.length - visibleCount)})
          </Button>
        )}
      </div>
    </div>
  );
}
