import { addDays, differenceInDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';
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

// Generate distinct colors for projects
const PROJECT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 70%, 50%)',
  'hsl(170, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(30, 80%, 50%)',
  'hsl(340, 70%, 50%)',
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
