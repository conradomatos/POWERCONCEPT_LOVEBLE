import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export interface RentabilidadeFiltersState {
  periodo: DateRange | undefined;
  cliente: string;
  statusProjeto: string;
  statusMargem: string;
}

interface RentabilidadeFiltersProps {
  filters: RentabilidadeFiltersState;
  onChange: (filters: RentabilidadeFiltersState) => void;
  clientes: { id: string; nome: string }[];
  className?: string;
}

const presets = [
  { label: 'Este mês', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mês anterior', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Últimos 3 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: 'Últimos 6 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: 'Este ano', getValue: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date(new Date().getFullYear(), 11, 31) }) },
];

export function RentabilidadeFilters({
  filters,
  onChange,
  clientes,
  className,
}: RentabilidadeFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const activeFiltersCount = [
    filters.periodo,
    filters.cliente !== 'all',
    filters.statusProjeto !== 'all',
    filters.statusMargem !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    onChange({
      periodo: undefined,
      cliente: 'all',
      statusProjeto: 'all',
      statusMargem: 'all',
    });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Período */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[200px]",
              !filters.periodo && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.periodo?.from ? (
              filters.periodo.to ? (
                <>
                  {format(filters.periodo.from, "dd MMM", { locale: ptBR })} –{" "}
                  {format(filters.periodo.to, "dd MMM yy", { locale: ptBR })}
                </>
              ) : (
                format(filters.periodo.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              "Selecionar período"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-2 space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    onChange({ ...filters, periodo: preset.getValue() });
                    setCalendarOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.periodo?.from}
              selected={filters.periodo}
              onSelect={(range) => onChange({ ...filters, periodo: range })}
              numberOfMonths={2}
              locale={ptBR}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Cliente */}
      <Select
        value={filters.cliente}
        onValueChange={(value) => onChange({ ...filters, cliente: value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {clientes.map((cliente) => (
            <SelectItem key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status do Projeto */}
      <Select
        value={filters.statusProjeto}
        onValueChange={(value) => onChange({ ...filters, statusProjeto: value })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="ATIVO">Ativo</SelectItem>
          <SelectItem value="CONCLUIDO">Concluído</SelectItem>
          <SelectItem value="SUSPENSO">Suspenso</SelectItem>
          <SelectItem value="CANCELADO">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      {/* Status da Margem */}
      <Select
        value={filters.statusMargem}
        onValueChange={(value) => onChange({ ...filters, statusMargem: value })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Margem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as margens</SelectItem>
          <SelectItem value="SAUDAVEL">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Saudável (≥20%)
            </span>
          </SelectItem>
          <SelectItem value="ATENCAO">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Atenção (10-20%)
            </span>
          </SelectItem>
          <SelectItem value="BAIXA">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Baixa (0-10%)
            </span>
          </SelectItem>
          <SelectItem value="NEGATIVA">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Negativa (&lt;0%)
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Contador e limpar */}
      {activeFiltersCount > 0 && (
        <>
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
          </Badge>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </>
      )}
    </div>
  );
}
