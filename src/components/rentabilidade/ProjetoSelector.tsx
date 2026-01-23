import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Projeto {
  id: string;
  os: string;
  nome: string;
  omie_codigo: number | null;
}

interface ProjetoSelectorProps {
  value: string | null;
  onChange: (projetoId: string) => void;
  projetos: Projeto[];
  disabled?: boolean;
}

export function ProjetoSelector({ value, onChange, projetos, disabled }: ProjetoSelectorProps) {
  const [open, setOpen] = useState(false);
  
  // Filtrar apenas projetos que ainda não têm omie_codigo
  const projetosDisponiveis = projetos.filter(p => !p.omie_codigo);
  const selected = projetos.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selected ? (
            <span className="truncate">
              <span className="font-mono text-xs mr-2">{selected.os}</span>
              {selected.nome}
            </span>
          ) : (
            "Selecionar projeto..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por OS ou nome..." />
          <CommandList>
            <CommandEmpty>Nenhum projeto disponível.</CommandEmpty>
            <CommandGroup>
              {projetosDisponiveis.map((projeto) => (
                <CommandItem
                  key={projeto.id}
                  value={`${projeto.os} ${projeto.nome}`}
                  onSelect={() => {
                    onChange(projeto.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === projeto.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono text-xs mr-2 text-muted-foreground">
                    {projeto.os}
                  </span>
                  <span className="truncate">{projeto.nome}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
