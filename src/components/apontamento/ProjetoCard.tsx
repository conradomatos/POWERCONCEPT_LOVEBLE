import { useState, useRef, useEffect } from 'react';
import { Building2, FileText, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ProjetoCardProps {
  projetoId: string;
  projetoOs: string;
  projetoNome: string;
  isSistema: boolean;
  horas: number | null;
  descricao: string | null;
  isSaved: boolean;
  onHorasChange: (horas: number | null) => void;
  onDescricaoChange: (descricao: string | null) => void;
}

export function ProjetoCard({
  projetoId,
  projetoOs,
  projetoNome,
  isSistema,
  horas,
  descricao,
  isSaved,
  onHorasChange,
  onDescricaoChange,
}: ProjetoCardProps) {
  const [showDescricao, setShowDescricao] = useState(false);
  const [localHoras, setLocalHoras] = useState(horas !== null ? String(horas) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local state with props
  useEffect(() => {
    setLocalHoras(horas !== null ? String(horas) : '');
  }, [horas]);

  const hasHoras = horas !== null && horas > 0;

  const handleHorasChange = (value: string) => {
    setLocalHoras(value);
    const parsed = parseFloat(value.replace(',', '.'));
    if (value === '' || value === '0') {
      onHorasChange(null);
    } else if (!isNaN(parsed)) {
      onHorasChange(parsed);
    }
  };

  const handleHorasBlur = () => {
    // Clean up the input on blur
    if (localHoras === '' || localHoras === '0') {
      setLocalHoras('');
      onHorasChange(null);
    } else {
      const parsed = parseFloat(localHoras.replace(',', '.'));
      if (!isNaN(parsed)) {
        setLocalHoras(String(parsed));
        onHorasChange(parsed);
      }
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-3 transition-all',
        'bg-card',
        hasHoras 
          ? 'border-primary/60 shadow-sm shadow-primary/10' 
          : 'border-border',
        isSaved && 'border-emerald-500/60'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          isSistema ? 'bg-muted' : 'bg-primary/10'
        )}>
          <Building2 className={cn(
            'h-5 w-5',
            isSistema ? 'text-muted-foreground' : 'text-primary'
          )} />
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {projetoOs} - {projetoNome}
          </p>
          {isSistema && (
            <span className="text-xs text-muted-foreground">Overhead</span>
          )}
        </div>

        {/* Hours Input */}
        <div className="flex items-center gap-2">
          {isSaved && (
            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          )}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={localHoras}
              onChange={(e) => handleHorasChange(e.target.value)}
              onBlur={handleHorasBlur}
              placeholder="0"
              className={cn(
                'w-16 h-11 text-center text-lg font-semibold pr-6',
                'focus:ring-2 focus:ring-primary',
                hasHoras && 'bg-primary/5'
              )}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              h
            </span>
          </div>
          
          {/* Note Toggle */}
          <button
            type="button"
            onClick={() => setShowDescricao(!showDescricao)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'hover:bg-muted',
              descricao ? 'text-primary' : 'text-muted-foreground'
            )}
            aria-label="Adicionar nota"
          >
            <FileText className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Description Field */}
      {showDescricao && (
        <div className="mt-3 pt-3 border-t border-border">
          <Textarea
            value={descricao || ''}
            onChange={(e) => onDescricaoChange(e.target.value || null)}
            placeholder="Adicione uma descrição ou observação..."
            className="min-h-[60px] text-sm resize-none"
          />
        </div>
      )}
    </div>
  );
}
