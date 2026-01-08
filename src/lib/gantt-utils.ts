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
