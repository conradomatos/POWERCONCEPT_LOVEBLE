import { addDays, differenceInDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodType = 'week' | 'fortnight' | 'month';

export interface GanttPeriod {
  start: Date;
  end: Date;
  days: Date[];
  label: string;
}

export function getGanttPeriod(date: Date, periodType: PeriodType): GanttPeriod {
  let start: Date;
  let end: Date;

  switch (periodType) {
    case 'week':
      start = startOfWeek(date, { weekStartsOn: 0 });
      end = endOfWeek(date, { weekStartsOn: 0 });
      break;
    case 'fortnight':
      start = startOfWeek(date, { weekStartsOn: 0 });
      end = addDays(start, 13);
      break;
    case 'month':
    default:
      start = startOfMonth(date);
      end = endOfMonth(date);
      break;
  }

  const days = eachDayOfInterval({ start, end });

  return {
    start,
    end,
    days,
    label: format(start, "MMMM 'de' yyyy", { locale: ptBR })
  };
}

export function getBlockPosition(
  blockStart: Date,
  blockEnd: Date,
  periodStart: Date,
  periodEnd: Date,
  totalDays: number
): { left: number; width: number } | null {
  // Check if block is within period
  if (blockEnd < periodStart || blockStart > periodEnd) {
    return null;
  }

  // Clamp dates to period
  const visibleStart = blockStart < periodStart ? periodStart : blockStart;
  const visibleEnd = blockEnd > periodEnd ? periodEnd : blockEnd;

  const startOffset = differenceInDays(visibleStart, periodStart);
  const duration = differenceInDays(visibleEnd, visibleStart) + 1;

  const left = (startOffset / totalDays) * 100;
  const width = (duration / totalDays) * 100;

  return { left, width };
}

export function formatDateShort(date: Date): string {
  return format(date, 'dd/MM', { locale: ptBR });
}

export function formatDateFull(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

export function getDayLabel(date: Date): string {
  return format(date, 'EEE', { locale: ptBR });
}

export function getDayNumber(date: Date): string {
  return format(date, 'd');
}

// Generate high-contrast, vibrant colors for projects
const PROJECT_COLORS = [
  '#2563EB', // Blue 600
  '#059669', // Emerald 600
  '#7C3AED', // Violet 600
  '#DC2626', // Red 600
  '#D97706', // Amber 600
  '#0891B2', // Cyan 600
  '#4F46E5', // Indigo 600
  '#DB2777', // Pink 600
  '#65A30D', // Lime 600
  '#EA580C', // Orange 600
];

export function getProjectColor(projectId: string, allProjectIds: string[]): string {
  const index = allProjectIds.indexOf(projectId);
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

export function isWithinEmployment(
  date: Date,
  hireDate: Date,
  terminationDate?: Date | null
): boolean {
  if (date < hireDate) return false;
  if (terminationDate && date > terminationDate) return false;
  return true;
}

/**
 * Groups an array of sorted date strings into clusters of consecutive dates.
 * Consecutive means difference of exactly 1 day between dates.
 * 
 * @example
 * Input: ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-15", "2026-01-29", "2026-01-30"]
 * Output: [["2026-01-05", "2026-01-06", "2026-01-07"], ["2026-01-15"], ["2026-01-29", "2026-01-30"]]
 */
export function groupConsecutiveDates(sortedDates: string[]): string[][] {
  if (sortedDates.length === 0) return [];
  
  const groups: string[][] = [];
  let currentGroup: string[] = [sortedDates[0]];
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = parseISO(sortedDates[i - 1]);
    const currDate = parseISO(sortedDates[i]);
    const diff = differenceInDays(currDate, prevDate);
    
    if (diff === 1) {
      currentGroup.push(sortedDates[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sortedDates[i]];
    }
  }
  groups.push(currentGroup);
  
  return groups;
}

// Stacked blocks for multiple projects on same day
export interface Block {
  id: string;
  colaborador_id: string;
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  empresa_nome: string;
  data_inicio: string;
  data_fim: string;
  observacao?: string | null;
  tipo: 'planejado' | 'realizado';
}

export interface StackedBlock extends Block {
  stackIndex: number;
  stackTotal: number;
}

export function calculateStackedBlocks(
  blocks: Block[],
  colaboradorId: string,
  periodDays: Date[]
): StackedBlock[] {
  const colBlocks = blocks.filter(b => b.colaborador_id === colaboradorId);
  
  if (colBlocks.length === 0) return [];
  
  // For each day, find which blocks are active
  const dayBlocksMap = new Map<string, Block[]>();
  
  for (const day of periodDays) {
    const dayStr = format(day, 'yyyy-MM-dd');
    const activeBlocks = colBlocks.filter(block => {
      const start = parseISO(block.data_inicio);
      const end = parseISO(block.data_fim);
      return day >= start && day <= end;
    });
    if (activeBlocks.length > 0) {
      dayBlocksMap.set(dayStr, activeBlocks);
    }
  }
  
  // Assign consistent stackIndex for each block
  const blockStackInfo = new Map<string, { index: number; total: number }>();
  
  for (const [, dayBlocks] of dayBlocksMap) {
    if (dayBlocks.length <= 1) continue;
    
    // Sort by projeto_id for consistency
    const sorted = [...dayBlocks].sort((a, b) => 
      a.projeto_id.localeCompare(b.projeto_id)
    );
    
    sorted.forEach((block, idx) => {
      const existing = blockStackInfo.get(block.id);
      // Update if this day has more overlapping blocks
      if (!existing || dayBlocks.length > existing.total) {
        blockStackInfo.set(block.id, {
          index: idx,
          total: dayBlocks.length
        });
      }
    });
  }
  
  return colBlocks.map(block => ({
    ...block,
    stackIndex: blockStackInfo.get(block.id)?.index ?? 0,
    stackTotal: blockStackInfo.get(block.id)?.total ?? 1,
  }));
}
