import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileText, Banknote } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type VisaoTipo = 'competencia' | 'caixa';

interface VisaoSwitchProps {
  value: VisaoTipo;
  onChange: (value: VisaoTipo) => void;
  className?: string;
}

export function VisaoSwitch({ value, onChange, className }: VisaoSwitchProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => val && onChange(val as VisaoTipo)}
      className={className}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="competencia" aria-label="Visão por Competência" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Competência</span>
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Regime de Competência</p>
          <p className="text-xs text-muted-foreground">
            Valores totais dos títulos (emitidos)
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="caixa" aria-label="Visão por Caixa" className="gap-1.5">
            <Banknote className="h-4 w-4" />
            <span className="hidden sm:inline">Caixa</span>
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Regime de Caixa</p>
          <p className="text-xs text-muted-foreground">
            Valores efetivamente recebidos/pagos
          </p>
        </TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
