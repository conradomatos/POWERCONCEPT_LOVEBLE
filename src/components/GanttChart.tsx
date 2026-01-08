import { useMemo, useState, useRef, useCallback } from 'react';
import { format, isWeekend, isToday, parseISO, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  getBlockPosition,
  getProjectColor,
  GanttPeriod,
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
import { Pencil, Trash2 } from 'lucide-react';

interface Block {
  id: string;
  colaborador_id: string;
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  empresa_nome: string;
  data_inicio: string;
  data_fim: string;
  tipo: 'planejado' | 'realizado';
  observacao?: string | null;
}

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

  const containerRef = useRef<HTMLDivElement>(null);

  const allProjectIds = useMemo(() => {
    return [...new Set(blocks.map((b) => b.projeto_id))];
  }, [blocks]);

  const cellWidth = 100 / period.days.length;

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

    setDragState(null);
  }, [dragState, period.days, onCreateBlock, onMoveBlock, onResizeBlock]);

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      setDragState(null);
    }
  }, [dragState]);

  // Get preview bar position for drag create
  const getPreviewPosition = useCallback(() => {
    if (!dragState || dragState.type !== 'create') return null;
    const minIndex = Math.min(dragState.startDayIndex, dragState.currentDayIndex);
    const maxIndex = Math.max(dragState.startDayIndex, dragState.currentDayIndex);
    const left = (minIndex / period.days.length) * 100;
    const width = ((maxIndex - minIndex + 1) / period.days.length) * 100;
    return { left, width };
  }, [dragState, period.days.length]);

  // Get modified block position during drag
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

  // Find today line position
  const todayIndex = useMemo(() => {
    return period.days.findIndex(day => isToday(day));
  }, [period.days]);
  const todayPosition = todayIndex >= 0 ? ((todayIndex + 0.5) / period.days.length) * 100 : null;

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
      ref={containerRef}
      className="border border-border rounded-lg overflow-hidden bg-card select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header - Month/Year */}
      <div className="flex border-b border-border bg-muted/50">
        <div className="w-52 flex-shrink-0 px-3 py-1 text-xs font-medium border-r border-border text-center">
          {format(period.start, "MMMM 'de' yyyy", { locale: ptBR })}
        </div>
        <div className="flex-1 flex items-center justify-center py-1 text-xs font-medium">
          {format(period.start, "MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>

      {/* Header - Day numbers */}
      <div className="flex border-b border-border bg-muted/30">
        <div className="w-52 flex-shrink-0 px-3 py-1 font-medium text-sm border-r border-border flex items-center">
          Colaborador
        </div>
        <div className="flex-1 flex relative">
          {period.days.map((day, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 text-center py-0.5 text-xs border-r border-border last:border-r-0 font-medium',
                isWeekend(day) && 'bg-muted/50',
                isToday(day) && 'bg-primary/20'
              )}
              style={{ width: `${cellWidth}%` }}
            >
              {format(day, 'd')}
            </div>
          ))}
        </div>
      </div>

      {/* Header - Day names */}
      <div className="flex border-b border-border bg-muted/20">
        <div className="w-52 flex-shrink-0 border-r border-border" />
        <div className="flex-1 flex relative">
          {period.days.map((day, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 text-center py-0.5 text-[10px] border-r border-border last:border-r-0 text-muted-foreground uppercase',
                isWeekend(day) && 'bg-muted/50 text-muted-foreground/70',
                isToday(day) && 'bg-primary/20 font-semibold'
              )}
              style={{ width: `${cellWidth}%` }}
            >
              {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
            </div>
          ))}
        </div>
      </div>

      {/* Rows - Collaborators */}
      <div className="divide-y divide-border">
        {collaborators.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            Nenhum colaborador encontrado
          </div>
        ) : (
          collaborators.map((col) => {
            const colBlocks = blocks.filter((b) => b.colaborador_id === col.id);
            const previewPosition = dragState?.colaboradorId === col.id ? getPreviewPosition() : null;

            return (
              <div key={col.id} className="flex min-h-[44px]">
                <div className="w-52 flex-shrink-0 px-3 py-2 text-sm border-r border-border flex items-center bg-background/50">
                  <span className="truncate font-medium" title={col.full_name}>
                    {col.full_name}
                  </span>
                </div>
                <div 
                  className="flex-1 relative"
                  onMouseDown={(e) => handleMouseDown(e, col.id, e.currentTarget)}
                  onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                >
                  {/* Day cells background */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {period.days.map((day, index) => {
                      const hireDate = parseISO(col.hire_date);
                      const termDate = col.termination_date
                        ? parseISO(col.termination_date)
                        : null;
                      const isDisabled = day < hireDate || (termDate && day > termDate);

                      return (
                        <div
                          key={index}
                          className={cn(
                            'flex-1 border-r border-border/50 last:border-r-0',
                            isWeekend(day) && 'bg-muted/20',
                            isDisabled && 'bg-muted/40',
                            isToday(day) && 'bg-primary/5'
                          )}
                          style={{ width: `${cellWidth}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* Today line */}
                  {todayPosition !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-destructive/70 z-20 pointer-events-none"
                      style={{ left: `${todayPosition}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-destructive" />
                    </div>
                  )}

                  {/* Preview bar when creating */}
                  {previewPosition && dragState?.type === 'create' && (
                    <div
                      className="absolute top-1.5 bottom-1.5 rounded-md bg-primary/40 border-2 border-primary border-dashed z-10 pointer-events-none"
                      style={{
                        left: `${previewPosition.left}%`,
                        width: `${previewPosition.width}%`,
                      }}
                    />
                  )}

                  {/* Blocks */}
                  {colBlocks.map((block) => {
                    const blockStart = parseISO(block.data_inicio);
                    const blockEnd = parseISO(block.data_fim);
                    
                    // Use modified position if dragging this block
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
                    const showTitle = duration > 2;

                    return (
                      <ContextMenu key={block.id}>
                        <ContextMenuTrigger asChild>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute top-1.5 bottom-1.5 rounded-md cursor-grab shadow-sm hover:shadow-lg transition-all z-10 flex items-center overflow-hidden group',
                                  isDragging && 'opacity-70 cursor-grabbing shadow-lg'
                                )}
                                style={{
                                  left: `${position.left}%`,
                                  width: `${position.width}%`,
                                  backgroundColor: color,
                                  minWidth: '24px',
                                }}
                                onMouseDown={(e) => {
                                  const target = e.target as HTMLElement;
                                  if (target.dataset.resize) return;
                                  const row = e.currentTarget.parentElement as HTMLElement;
                                  handleBlockMouseDown(e, block, 'move', row);
                                }}
                                onClick={(e) => {
                                  if (!dragState) {
                                    e.stopPropagation();
                                    onEditBlock(block);
                                  }
                                }}
                              >
                                {/* Left resize handle */}
                                <div
                                  data-resize="left"
                                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/20 transition-colors"
                                  onMouseDown={(e) => {
                                    const row = e.currentTarget.parentElement?.parentElement as HTMLElement;
                                    handleBlockMouseDown(e, block, 'resize-left', row);
                                  }}
                                />
                                
                                {/* Content */}
                                <div className="flex-1 px-2 flex items-center min-w-0">
                                  <span className="text-xs font-bold text-white drop-shadow-sm truncate">
                                    {block.projeto_os}
                                    {showTitle && ` - ${block.projeto_nome}`}
                                  </span>
                                </div>

                                {/* Right resize handle */}
                                <div
                                  data-resize="right"
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/20 transition-colors"
                                  onMouseDown={(e) => {
                                    const row = e.currentTarget.parentElement?.parentElement as HTMLElement;
                                    handleBlockMouseDown(e, block, 'resize-right', row);
                                  }}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="text-sm space-y-1">
                                <div className="font-bold text-primary">
                                  OS {block.projeto_os}
                                </div>
                                <div className="font-medium">
                                  {block.projeto_nome}
                                </div>
                                <div className="text-muted-foreground">
                                  {block.empresa_nome}
                                </div>
                                <div className="text-xs text-muted-foreground pt-1 border-t">
                                  {format(blockStart, 'dd/MM/yyyy')} a {format(blockEnd, 'dd/MM/yyyy')}
                                </div>
                                <div className="text-xs">
                                  Tipo: <span className="capitalize">{block.tipo}</span>
                                </div>
                                {block.observacao && (
                                  <div className="text-xs italic pt-1 border-t">
                                    {block.observacao}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => onEditBlock(block)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => onDeleteBlock(block.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </ContextMenuItem>
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
  const cellWidth = 100 / period.days.length;
  const todayIndex = period.days.findIndex(day => isToday(day));

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header - Day numbers */}
      <div className="flex border-b border-border bg-muted/30">
        <div className="w-52 flex-shrink-0 px-3 py-1 font-medium text-sm border-r border-border flex items-center">
          Colaborador
        </div>
        <div className="flex-1 flex">
          {period.days.map((day, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 text-center py-0.5 text-xs border-r border-border last:border-r-0 font-medium',
                isWeekend(day) && 'bg-muted/50',
                isToday(day) && 'bg-primary/20'
              )}
              style={{ width: `${cellWidth}%` }}
            >
              {format(day, 'd')}
            </div>
          ))}
        </div>
      </div>

      {/* Header - Day names */}
      <div className="flex border-b border-border bg-muted/20">
        <div className="w-52 flex-shrink-0 border-r border-border" />
        <div className="flex-1 flex">
          {period.days.map((day, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 text-center py-0.5 text-[10px] border-r border-border last:border-r-0 text-muted-foreground uppercase',
                isWeekend(day) && 'bg-muted/50',
                isToday(day) && 'bg-primary/20'
              )}
              style={{ width: `${cellWidth}%` }}
            >
              {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {collaborators.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            Nenhum colaborador encontrado
          </div>
        ) : (
          collaborators.map((col) => {
            const colBlocks = blocks.filter((b) => b.colaborador_id === col.id);

            return (
              <div key={col.id} className="flex min-h-[40px]">
                <div className="w-52 flex-shrink-0 px-3 py-2 text-sm border-r border-border flex items-center bg-background/50">
                  <span className="truncate font-medium" title={col.full_name}>
                    {col.full_name}
                  </span>
                </div>
                <div className="flex-1 flex">
                  {period.days.map((day, index) => {
                    const hireDate = parseISO(col.hire_date);
                    const termDate = col.termination_date ? parseISO(col.termination_date) : null;
                    const isDisabled = day < hireDate || (termDate && day > termDate);
                    
                    // Find block for this day
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
                              'flex-1 border-r border-border last:border-r-0 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors',
                              isWeekend(day) && !blockForDay && 'bg-muted/20',
                              isToday(day) && !blockForDay && 'bg-primary/10',
                              isDisabled && 'bg-muted/40 cursor-not-allowed',
                              !blockForDay && !isDisabled && 'hover:bg-accent/30'
                            )}
                            style={{ 
                              width: `${cellWidth}%`,
                              backgroundColor: blockForDay ? color : undefined,
                              color: blockForDay ? 'white' : undefined,
                            }}
                            onClick={() => {
                              if (blockForDay) {
                                onEditBlock(blockForDay);
                              } else if (!isDisabled) {
                                onCreateBlock(col.id, day, day);
                              }
                            }}
                          >
                            {blockForDay?.projeto_os}
                          </div>
                        </TooltipTrigger>
                        {blockForDay && (
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-bold">OS {blockForDay.projeto_os}</div>
                              <div>{blockForDay.projeto_nome}</div>
                              <div className="text-muted-foreground">{blockForDay.empresa_nome}</div>
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