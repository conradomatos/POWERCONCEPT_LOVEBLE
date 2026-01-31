import { useMemo, useState, useCallback } from 'react';
import { format, isWeekend, isToday, parseISO, addDays, differenceInDays, isMonday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  getBlockPosition,
  getProjectColor,
  GanttPeriod,
  calculateStackedBlocks,
  type Block,
  type StackedBlock,
} from '@/lib/gantt-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Collaborator {
  id: string;
  full_name: string;
  hire_date: string;
  termination_date?: string | null;
}

interface GanttChartProps {
  collaborators: Collaborator[];
  blocks: Block[];
  period: GanttPeriod;
  onEditBlock: (block: Block) => void;
  onDeleteBlock: (blockId: string) => void;
  onCreateBlock: (colaboradorId: string, startDate: Date, endDate: Date) => void;
  onMoveBlock?: (blockId: string, newStartDate: Date, newEndDate: Date) => void;
  onResizeBlock?: (blockId: string, newStartDate: Date, newEndDate: Date) => void;
  viewMode: 'gantt' | 'grid';
  canDeleteRealized?: boolean;
}

export default function GanttChart({
  collaborators,
  blocks,
  period,
  onEditBlock,
  onDeleteBlock,
  onCreateBlock,
  onMoveBlock,
  onResizeBlock,
  viewMode,
  canDeleteRealized = false,
}: GanttChartProps) {
  const [dragState, setDragState] = useState<{
    type: 'create' | 'move' | 'resize-left' | 'resize-right';
    colaboradorId: string;
    blockId?: string;
    startDayIndex: number;
    currentDayIndex: number;
    originalStart?: Date;
    originalEnd?: Date;
  } | null>(null);

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  
  // Flag to prevent click event immediately after drag/resize
  const [justFinishedDrag, setJustFinishedDrag] = useState(false);

  const allProjectIds = useMemo(() => {
    return [...new Set(blocks.map((b) => b.projeto_id))];
  }, [blocks]);

  const getDayIndexFromEvent = useCallback((e: React.MouseEvent, rowElement: HTMLElement): number => {
    const rect = rowElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    return Math.floor(percentage * period.days.length);
  }, [period.days.length]);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    colaboradorId: string,
    rowElement: HTMLElement
  ) => {
    e.preventDefault();
    const dayIndex = getDayIndexFromEvent(e, rowElement);
    if (dayIndex < 0 || dayIndex >= period.days.length) return;
    
    const col = collaborators.find(c => c.id === colaboradorId);
    if (!col) return;
    
    const day = period.days[dayIndex];
    const hireDate = parseISO(col.hire_date);
    const termDate = col.termination_date ? parseISO(col.termination_date) : null;
    if (day < hireDate || (termDate && day > termDate)) return;

    setDragState({
      type: 'create',
      colaboradorId,
      startDayIndex: dayIndex,
      currentDayIndex: dayIndex,
    });
  }, [collaborators, getDayIndexFromEvent, period.days]);

  const handleBlockMouseDown = useCallback((
    e: React.MouseEvent,
    block: Block,
    type: 'move' | 'resize-left' | 'resize-right',
    rowElement: HTMLElement
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const dayIndex = getDayIndexFromEvent(e, rowElement);
    
    setDragState({
      type,
      colaboradorId: block.colaborador_id,
      blockId: block.id,
      startDayIndex: dayIndex,
      currentDayIndex: dayIndex,
      originalStart: parseISO(block.data_inicio),
      originalEnd: parseISO(block.data_fim),
    });
  }, [getDayIndexFromEvent]);

  const handleMouseMove = useCallback((e: React.MouseEvent, rowElement: HTMLElement) => {
    if (!dragState) return;
    const dayIndex = getDayIndexFromEvent(e, rowElement);
    if (dayIndex !== dragState.currentDayIndex) {
      setDragState(prev => prev ? { ...prev, currentDayIndex: dayIndex } : null);
    }
  }, [dragState, getDayIndexFromEvent]);

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;

    const { type, colaboradorId, blockId, startDayIndex, currentDayIndex, originalStart, originalEnd } = dragState;
    
    // Check if there was actual movement (drag/resize)
    const hasMoved = startDayIndex !== currentDayIndex;
    
    if (type === 'create') {
      const minIndex = Math.min(startDayIndex, currentDayIndex);
      const maxIndex = Math.max(startDayIndex, currentDayIndex);
      const startDate = period.days[minIndex];
      const endDate = period.days[maxIndex];
      onCreateBlock(colaboradorId, startDate, endDate);
    } else if (type === 'move' && blockId && originalStart && originalEnd && onMoveBlock) {
      const dayDiff = currentDayIndex - startDayIndex;
      const newStart = addDays(originalStart, dayDiff);
      const newEnd = addDays(originalEnd, dayDiff);
      onMoveBlock(blockId, newStart, newEnd);
    } else if (type === 'resize-left' && blockId && originalStart && originalEnd && onResizeBlock) {
      const dayDiff = currentDayIndex - startDayIndex;
      const newStart = addDays(originalStart, dayDiff);
      if (newStart <= originalEnd) {
        onResizeBlock(blockId, newStart, originalEnd);
      }
    } else if (type === 'resize-right' && blockId && originalStart && originalEnd && onResizeBlock) {
      const dayDiff = currentDayIndex - startDayIndex;
      const newEnd = addDays(originalEnd, dayDiff);
      if (newEnd >= originalStart) {
        onResizeBlock(blockId, originalStart, newEnd);
      }
    }

    // If there was movement (drag/resize on existing block), set flag to prevent immediate click
    if (hasMoved && type !== 'create') {
      setJustFinishedDrag(true);
      setTimeout(() => setJustFinishedDrag(false), 300);
    }

    setDragState(null);
  }, [dragState, period.days, onCreateBlock, onMoveBlock, onResizeBlock]);

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      setDragState(null);
    }
  }, [dragState]);

  const getPreviewPosition = useCallback(() => {
    if (!dragState || dragState.type !== 'create') return null;
    const minIndex = Math.min(dragState.startDayIndex, dragState.currentDayIndex);
    const maxIndex = Math.max(dragState.startDayIndex, dragState.currentDayIndex);
    const left = (minIndex / period.days.length) * 100;
    const width = ((maxIndex - minIndex + 1) / period.days.length) * 100;
    return { left, width };
  }, [dragState, period.days.length]);

  const getModifiedBlockPosition = useCallback((block: Block) => {
    if (!dragState || dragState.blockId !== block.id) return null;
    
    const { type, startDayIndex, currentDayIndex, originalStart, originalEnd } = dragState;
    if (!originalStart || !originalEnd) return null;

    const dayDiff = currentDayIndex - startDayIndex;
    
    let newStart = originalStart;
    let newEnd = originalEnd;

    if (type === 'move') {
      newStart = addDays(originalStart, dayDiff);
      newEnd = addDays(originalEnd, dayDiff);
    } else if (type === 'resize-left') {
      newStart = addDays(originalStart, dayDiff);
      if (newStart > originalEnd) newStart = originalEnd;
    } else if (type === 'resize-right') {
      newEnd = addDays(originalEnd, dayDiff);
      if (newEnd < originalStart) newEnd = originalStart;
    }

    return getBlockPosition(newStart, newEnd, period.start, period.end, period.days.length);
  }, [dragState, period.start, period.end, period.days.length]);

  const todayIndex = useMemo(() => {
    return period.days.findIndex(day => isToday(day));
  }, [period.days]);

  if (viewMode === 'grid') {
    return (
      <GridView
        collaborators={collaborators}
        blocks={blocks}
        period={period}
        allProjectIds={allProjectIds}
        onEditBlock={onEditBlock}
        onCreateBlock={onCreateBlock}
      />
    );
  }

  return (
    <div 
      className="border border-border rounded-lg overflow-hidden bg-card select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        {/* Month/Year row */}
        <div className="flex border-b border-border/50">
          <div className="w-56 flex-shrink-0 bg-muted/30 border-r border-border" />
          <div className="flex-1 py-2 text-center text-sm font-semibold text-foreground capitalize">
            {format(period.start, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>

        {/* Day numbers row */}
        <div className="flex border-b border-border/50">
          <div className="w-56 flex-shrink-0 bg-muted/30 border-r border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Colaborador
          </div>
          <div className="flex-1 flex relative">
            {period.days.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'flex-1 text-center py-1 text-sm font-semibold transition-colors',
                  isWeekend(day) && 'bg-muted/40 text-muted-foreground',
                  isToday(day) && 'bg-primary/15 text-primary',
                  isMonday(day) && index > 0 && 'border-l-2 border-border'
                )}
              >
                {format(day, 'd')}
              </div>
            ))}
          </div>
        </div>

        {/* Weekday names row */}
        <div className="flex">
          <div className="w-56 flex-shrink-0 bg-muted/30 border-r border-border" />
          <div className="flex-1 flex relative">
            {period.days.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'flex-1 text-center py-1 text-[10px] font-medium uppercase tracking-wider',
                  isWeekend(day) ? 'bg-muted/40 text-muted-foreground/70' : 'text-muted-foreground',
                  isToday(day) && 'bg-primary/15 text-primary font-bold',
                  isMonday(day) && index > 0 && 'border-l-2 border-border'
                )}
              >
                {format(day, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {collaborators.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            Nenhum colaborador encontrado
          </div>
        ) : (
          collaborators.map((col) => {
            const colBlocks = calculateStackedBlocks(blocks, col.id, period.days);
            const previewPosition = dragState?.colaboradorId === col.id ? getPreviewPosition() : null;
            const isHovered = hoveredRow === col.id;
            
            // Calculate max stacks for dynamic row height
            const maxStacks = colBlocks.length > 0 
              ? Math.max(1, ...colBlocks.map(b => b.stackTotal))
              : 1;
            const rowHeight = 40 + (maxStacks - 1) * 28; // Base 40px + 28px per additional stack

            return (
              <div 
                key={col.id} 
                className={cn(
                  'flex transition-all',
                  isHovered && 'bg-accent/20'
                )}
                style={{ minHeight: `${rowHeight}px` }}
                onMouseEnter={() => setHoveredRow(col.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Sticky collaborator name */}
                <div className="w-56 flex-shrink-0 sticky left-0 z-10 bg-card border-r border-border px-4 flex items-center">
                  <span 
                    className="text-sm font-medium text-foreground truncate" 
                    title={col.full_name}
                  >
                    {col.full_name}
                  </span>
                </div>

                {/* Timeline area */}
                <div 
                  className="flex-1 relative"
                  style={{ minHeight: `${rowHeight}px` }}
                  onMouseDown={(e) => handleMouseDown(e, col.id, e.currentTarget)}
                  onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                >
                  {/* Day columns (subtle grid) */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {period.days.map((day, index) => {
                      const hireDate = parseISO(col.hire_date);
                      const termDate = col.termination_date ? parseISO(col.termination_date) : null;
                      const isDisabled = day < hireDate || (termDate && day > termDate);

                      return (
                        <div
                          key={index}
                          className={cn(
                            'flex-1',
                            isWeekend(day) && 'bg-muted/20',
                            isDisabled && 'bg-muted/30',
                            isMonday(day) && index > 0 && 'border-l border-border/50'
                          )}
                        />
                      );
                    })}
                  </div>

                  {/* Today line */}
                  {todayIndex >= 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-destructive z-30 pointer-events-none"
                      style={{ left: `${((todayIndex + 0.5) / period.days.length) * 100}%` }}
                    />
                  )}

                  {/* Preview bar when creating */}
                  {previewPosition && dragState?.type === 'create' && (
                    <div
                      className="absolute rounded-lg bg-primary/30 border-2 border-primary border-dashed z-20 pointer-events-none"
                      style={{
                        left: `${previewPosition.left}%`,
                        width: `${previewPosition.width}%`,
                        top: '4px',
                        height: `${rowHeight - 8}px`,
                      }}
                    />
                  )}

                  {/* Allocation blocks */}
                  {colBlocks.map((block) => {
                    const blockStart = parseISO(block.data_inicio);
                    const blockEnd = parseISO(block.data_fim);
                    
                    const modifiedPosition = getModifiedBlockPosition(block);
                    const position = modifiedPosition || getBlockPosition(
                      blockStart,
                      blockEnd,
                      period.start,
                      period.end,
                      period.days.length
                    );

                    if (!position) return null;

                    const color = getProjectColor(block.projeto_id, allProjectIds);
                    const isDragging = dragState?.blockId === block.id;
                    const duration = differenceInDays(blockEnd, blockStart) + 1;
                    const isLarge = duration > 3;
                    const isRealized = block.tipo === 'realizado';
                    
                    // Calculate stacked position
                    const blockHeight = maxStacks > 1 
                      ? (rowHeight - 8) / maxStacks 
                      : rowHeight - 8;
                    const blockTop = 4 + (block.stackIndex * blockHeight);
                    
                    // Planejado styling: dashed border, reduced opacity
                    const isPlanejado = block.tipo === 'planejado';

                    return (
                      <ContextMenu key={block.id}>
                        <ContextMenuTrigger asChild>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute rounded-lg cursor-grab transition-all z-10 flex flex-col justify-center overflow-hidden group',
                                  'shadow-md hover:shadow-xl hover:scale-[1.02]',
                                  isDragging && 'opacity-80 cursor-grabbing shadow-xl scale-[1.02]',
                                  isRealized && 'border-2 border-white/50',
                                  isPlanejado && 'border-2 border-dashed border-white/70'
                                )}
                                style={{
                                  left: `${position.left}%`,
                                  width: `${position.width}%`,
                                  top: `${blockTop}px`,
                                  height: `${blockHeight - 2}px`,
                                  backgroundColor: isPlanejado ? `${color}99` : color,
                                  minWidth: '28px',
                                }}
                                onMouseDown={(e) => {
                                  // Ignorar clique direito para permitir o ContextMenu
                                  if (e.button === 2) return;
                                  const target = e.target as HTMLElement;
                                  if (target.dataset.resize) return;
                                  const row = e.currentTarget.parentElement as HTMLElement;
                                  handleBlockMouseDown(e, block, 'move', row);
                                }}
                                onClick={(e) => {
                                  // Only open modal if not in drag state AND not just finished a drag
                                  if (!dragState && !justFinishedDrag) {
                                    e.stopPropagation();
                                    onEditBlock(block);
                                  }
                                }}
                              >
                                {/* Left resize handle */}
                                <div
                                  data-resize="left"
                                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors rounded-l-lg"
                                  onMouseDown={(e) => {
                                    const row = e.currentTarget.parentElement?.parentElement as HTMLElement;
                                    handleBlockMouseDown(e, block, 'resize-left', row);
                                  }}
                                />
                                
                                {/* Content */}
                                <div className="px-2 min-w-0 flex items-center gap-1">
                                  {isRealized && (
                                    <CheckCircle2 className="h-3 w-3 text-white/80 flex-shrink-0" />
                                  )}
                                  {isPlanejado && (
                                    <div className="w-2 h-2 rounded-full border border-white/70 flex-shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-white font-bold text-xs drop-shadow-sm truncate leading-tight">
                                      {block.projeto_os}
                                    </div>
                                    {isLarge && blockHeight > 30 && (
                                      <div className="text-white/80 text-[10px] truncate leading-tight">
                                        {block.projeto_nome}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right resize handle */}
                                <div
                                  data-resize="right"
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors rounded-r-lg"
                                  onMouseDown={(e) => {
                                    const row = e.currentTarget.parentElement?.parentElement as HTMLElement;
                                    handleBlockMouseDown(e, block, 'resize-right', row);
                                  }}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs z-50">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="inline-block w-3 h-3 rounded-sm" 
                                    style={{ backgroundColor: color }} 
                                  />
                                  <span className="font-bold text-primary">OS {block.projeto_os}</span>
                                  {isRealized && (
                                    <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                                      Realizado
                                    </span>
                                  )}
                                  {isPlanejado && (
                                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-dashed">
                                      Planejado
                                    </span>
                                  )}
                                </div>
                                <div className="font-medium">{block.projeto_nome}</div>
                                <div className="text-muted-foreground text-xs">{block.empresa_nome}</div>
                                <div className="border-t pt-1.5 mt-1.5 text-xs text-muted-foreground">
                                  {format(blockStart, 'dd/MM/yyyy')} → {format(blockEnd, 'dd/MM/yyyy')}
                                </div>
                                {block.observacao && (
                                  <div className="text-xs italic text-muted-foreground border-t pt-1.5">
                                    {block.observacao}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="z-50">
                          <ContextMenuItem onClick={() => onEditBlock(block)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </ContextMenuItem>
                          {(block.tipo === 'planejado' || canDeleteRealized) ? (
                            <ContextMenuItem
                              onClick={() => onDeleteBlock(block.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </ContextMenuItem>
                          ) : (
                            <ContextMenuItem
                              disabled
                              className="text-muted-foreground cursor-not-allowed"
                              onClick={() => toast.info('Apenas o Admin Master pode excluir blocos realizados')}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir (somente Admin Master)
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-3 border-t border-border bg-muted/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-6 h-4 rounded bg-primary border-2 border-white/50" />
          <span>Realizado</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-6 h-4 rounded bg-primary/60 border-2 border-dashed border-white/70" />
          <span>Planejado</span>
        </div>
      </div>
    </div>
  );
}

// Grid View Component
function GridView({
  collaborators,
  blocks,
  period,
  allProjectIds,
  onEditBlock,
  onCreateBlock,
}: {
  collaborators: Collaborator[];
  blocks: Block[];
  period: GanttPeriod;
  allProjectIds: string[];
  onEditBlock: (block: Block) => void;
  onCreateBlock: (colaboradorId: string, startDate: Date, endDate: Date) => void;
}) {
  const todayIndex = period.days.findIndex(day => isToday(day));

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        {/* Month/Year row */}
        <div className="flex border-b border-border/50">
          <div className="w-56 flex-shrink-0 bg-muted/30 border-r border-border" />
          <div className="flex-1 py-2 text-center text-sm font-semibold text-foreground capitalize">
            {format(period.start, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>

        {/* Day numbers */}
        <div className="flex border-b border-border/50">
          <div className="w-56 flex-shrink-0 bg-muted/30 border-r border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Colaborador
          </div>
          <div className="flex-1 flex">
            {period.days.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'flex-1 text-center py-1 text-sm font-semibold border-r border-border/30 last:border-r-0',
                  isWeekend(day) && 'bg-muted/40 text-muted-foreground',
                  isToday(day) && 'bg-primary/15 text-primary',
                  isMonday(day) && index > 0 && 'border-l-2 border-border'
                )}
              >
                {format(day, 'd')}
              </div>
            ))}
          </div>
        </div>

        {/* Weekday names */}
        <div className="flex">
          <div className="w-56 flex-shrink-0 bg-muted/30 border-r border-border" />
          <div className="flex-1 flex">
            {period.days.map((day, index) => (
              <div
                key={index}
                className={cn(
                  'flex-1 text-center py-1 text-[10px] font-medium uppercase tracking-wider border-r border-border/30 last:border-r-0',
                  isWeekend(day) ? 'bg-muted/40 text-muted-foreground/70' : 'text-muted-foreground',
                  isToday(day) && 'bg-primary/15 text-primary font-bold',
                  isMonday(day) && index > 0 && 'border-l-2 border-border'
                )}
              >
                {format(day, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {collaborators.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            Nenhum colaborador encontrado
          </div>
        ) : (
          collaborators.map((col) => {
            const colBlocks = blocks.filter((b) => b.colaborador_id === col.id);

            return (
              <div key={col.id} className="flex h-12 hover:bg-accent/10 transition-colors">
                {/* Sticky name */}
                <div className="w-56 flex-shrink-0 sticky left-0 z-10 bg-card border-r border-border px-4 flex items-center">
                  <span className="text-sm font-medium truncate" title={col.full_name}>
                    {col.full_name}
                  </span>
                </div>

                {/* Cells */}
                <div className="flex-1 flex relative">
                  {/* Today line */}
                  {todayIndex >= 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20 pointer-events-none"
                      style={{ left: `${((todayIndex + 0.5) / period.days.length) * 100}%` }}
                    />
                  )}

                  {period.days.map((day, index) => {
                    const hireDate = parseISO(col.hire_date);
                    const termDate = col.termination_date ? parseISO(col.termination_date) : null;
                    const isDisabled = day < hireDate || (termDate && day > termDate);
                    
                    const blockForDay = colBlocks.find(b => {
                      const start = parseISO(b.data_inicio);
                      const end = parseISO(b.data_fim);
                      return day >= start && day <= end;
                    });

                    const color = blockForDay ? getProjectColor(blockForDay.projeto_id, allProjectIds) : undefined;

                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'flex-1 flex items-center justify-center text-xs font-bold cursor-pointer transition-all border-r border-border/20 last:border-r-0',
                              isWeekend(day) && !blockForDay && 'bg-muted/15',
                              isToday(day) && !blockForDay && 'bg-primary/5',
                              isDisabled && 'bg-muted/25 cursor-not-allowed',
                              isMonday(day) && index > 0 && 'border-l border-border/50',
                              !blockForDay && !isDisabled && 'hover:bg-accent/20'
                            )}
                            style={{ 
                              backgroundColor: blockForDay ? color : undefined,
                            }}
                            onClick={() => {
                              if (blockForDay) {
                                onEditBlock(blockForDay);
                              } else if (!isDisabled) {
                                onCreateBlock(col.id, day, day);
                              }
                            }}
                          >
                            {blockForDay && (
                              <span className="text-white font-bold text-[11px] drop-shadow-sm">
                                {blockForDay.projeto_os}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        {blockForDay && (
                          <TooltipContent className="z-50">
                            <div className="space-y-1">
                              <div className="font-bold text-primary">OS {blockForDay.projeto_os}</div>
                              <div className="font-medium">{blockForDay.projeto_nome}</div>
                              <div className="text-muted-foreground text-xs">{blockForDay.empresa_nome}</div>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}