import { useMemo, useState, useRef } from 'react';
import { format, isWeekend, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  getBlockPosition,
  getDayLabel,
  getDayNumber,
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
  projeto_codigo: string;
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
  onCreateBlock: (colaboradorId: string, date: Date) => void;
}

export default function GanttChart({
  collaborators,
  blocks,
  period,
  onEditBlock,
  onDeleteBlock,
  onCreateBlock,
}: GanttChartProps) {
  const allProjectIds = useMemo(() => {
    return [...new Set(blocks.map((b) => b.projeto_id))];
  }, [blocks]);

  const cellWidth = 100 / period.days.length;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header - Days */}
      <div className="flex border-b border-border bg-muted/50">
        <div className="w-48 flex-shrink-0 px-3 py-2 font-medium text-sm border-r border-border">
          Colaborador
        </div>
        <div className="flex-1 flex">
          {period.days.map((day, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 text-center py-1 text-xs border-r border-border last:border-r-0',
                isWeekend(day) && 'bg-muted'
              )}
              style={{ width: `${cellWidth}%` }}
            >
              <div className="font-medium">{getDayLabel(day)}</div>
              <div className="text-muted-foreground">{getDayNumber(day)}</div>
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

            return (
              <div key={col.id} className="flex min-h-[48px]">
                <div className="w-48 flex-shrink-0 px-3 py-2 text-sm border-r border-border flex items-center">
                  <span className="truncate" title={col.full_name}>
                    {col.full_name}
                  </span>
                </div>
                <div className="flex-1 relative">
                  {/* Day cells (for click to create) */}
                  <div className="absolute inset-0 flex">
                    {period.days.map((day, index) => {
                      const hireDate = parseISO(col.hire_date);
                      const termDate = col.termination_date
                        ? parseISO(col.termination_date)
                        : null;
                      const isDisabled =
                        day < hireDate || (termDate && day > termDate);

                      return (
                        <div
                          key={index}
                          className={cn(
                            'flex-1 border-r border-border last:border-r-0 cursor-pointer hover:bg-accent/30 transition-colors',
                            isWeekend(day) && 'bg-muted/30',
                            isDisabled && 'bg-muted/50 cursor-not-allowed'
                          )}
                          style={{ width: `${cellWidth}%` }}
                          onClick={() => {
                            if (!isDisabled) {
                              onCreateBlock(col.id, day);
                            }
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Blocks */}
                  {colBlocks.map((block) => {
                    const blockStart = parseISO(block.data_inicio);
                    const blockEnd = parseISO(block.data_fim);
                    const position = getBlockPosition(
                      blockStart,
                      blockEnd,
                      period.start,
                      period.end,
                      period.days.length
                    );

                    if (!position) return null;

                    const color = getProjectColor(block.projeto_id, allProjectIds);

                    return (
                      <ContextMenu key={block.id}>
                        <ContextMenuTrigger asChild>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute top-1 bottom-1 rounded cursor-pointer shadow-sm hover:shadow-md transition-shadow z-10 flex items-center px-2 overflow-hidden"
                                style={{
                                  left: `${position.left}%`,
                                  width: `${position.width}%`,
                                  backgroundColor: color,
                                  minWidth: '24px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditBlock(block);
                                }}
                              >
                                <span className="text-xs font-medium text-white truncate">
                                  {block.projeto_codigo}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {block.projeto_codigo} - {block.projeto_nome}
                                </div>
                                <div className="text-muted-foreground">
                                  {format(blockStart, 'dd/MM/yyyy')} a{' '}
                                  {format(blockEnd, 'dd/MM/yyyy')}
                                </div>
                                {block.observacao && (
                                  <div className="mt-1 text-xs">
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
