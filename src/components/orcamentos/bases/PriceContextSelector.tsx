import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin } from 'lucide-react';
import { useEmpresas, useRegions } from '@/hooks/orcamentos/usePricebook';

interface PriceContextSelectorProps {
  empresaId: string | null;
  regiaoId: string | null;
  onEmpresaChange: (id: string | null) => void;
  onRegiaoChange: (id: string | null) => void;
  className?: string;
}

export function PriceContextSelector({
  empresaId,
  regiaoId,
  onEmpresaChange,
  onRegiaoChange,
  className,
}: PriceContextSelectorProps) {
  const { empresas } = useEmpresas();
  const { regions } = useRegions();

  const selectedEmpresa = empresas.find(e => e.id === empresaId);
  const selectedRegiao = regions.find(r => r.id === regiaoId);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Empresa selector */}
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select
          value={empresaId || '__all__'}
          onValueChange={(v) => onEmpresaChange(v === '__all__' ? null : v)}
        >
          <SelectTrigger className="h-8 w-[180px] text-sm">
            <SelectValue placeholder="Todas empresas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              <span className="text-muted-foreground">Global (todas)</span>
            </SelectItem>
            {empresas.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>
                <span className="font-mono text-xs text-muted-foreground mr-2">{emp.codigo}</span>
                {emp.empresa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Região selector */}
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <Select
          value={regiaoId || '__all__'}
          onValueChange={(v) => onRegiaoChange(v === '__all__' ? null : v)}
        >
          <SelectTrigger className="h-8 w-[180px] text-sm">
            <SelectValue placeholder="Todas regiões" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              <span className="text-muted-foreground">Global (todas)</span>
            </SelectItem>
            {regions.map(reg => (
              <SelectItem key={reg.id} value={reg.id}>
                <span className="font-mono text-xs text-muted-foreground mr-2">{reg.codigo}</span>
                {reg.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Context Badge */}
      {(empresaId || regiaoId) && (
        <Badge variant="outline" className="text-xs">
          Contexto: 
          {empresaId && selectedEmpresa ? ` ${selectedEmpresa.codigo}` : ''}
          {empresaId && regiaoId ? ' + ' : ''}
          {regiaoId && selectedRegiao ? ` ${selectedRegiao.codigo}` : ''}
        </Badge>
      )}
    </div>
  );
}
