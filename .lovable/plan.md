

# Plano Corrigido: Puxar Apontamentos para Datas Nao-Consecutivas

## Resumo

Corrigir a funcao `handlePullApontamentos` para tratar corretamente lancamentos em datas nao-consecutivas, criando blocos separados ao inves de um unico bloco com datas incorretas.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/gantt-utils.ts` | Adicionar funcao `groupConsecutiveDates` |
| `src/pages/Planejamento.tsx` | Refatorar logica de criacao de blocos |

---

## 1. Adicionar funcao em gantt-utils.ts

Inserir antes de `calculateStackedBlocks`:

```typescript
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
```

---

## 2. Atualizar imports em Planejamento.tsx

Linha 48:
```typescript
import { format, addMonths, subMonths, addWeeks, subWeeks, parseISO, eachDayOfInterval, addDays } from 'date-fns';
```

Linha 49:
```typescript
import { getGanttPeriod, PeriodType, groupConsecutiveDates } from '@/lib/gantt-utils';
```

---

## 3. Refatorar handlePullApontamentos (linhas 483-540)

Substituir a logica atual por iteracao sobre grupos consecutivos:

```typescript
// For each group, create or expand realizado block
for (const [, group] of groupedMap) {
  // Deduplicate and sort dates
  const sortedDates = [...new Set(group.dates)].sort();
  
  // NEW: Separate into consecutive date groups
  const dateGroups = groupConsecutiveDates(sortedDates);
  
  // For EACH consecutive date group
  for (const consecutiveDates of dateGroups) {
    const minDate = consecutiveDates[0];
    const maxDate = consecutiveDates[consecutiveDates.length - 1];
    
    // Search for blocks that overlap OR are adjacent (+/- 1 day)
    const { data: existingBlocks, error: searchError } = await supabase
      .from('alocacoes_blocos')
      .select('id, data_inicio, data_fim')
      .eq('colaborador_id', group.colaborador_id)
      .eq('projeto_id', group.projeto_id)
      .eq('tipo', 'realizado')
      .lte('data_inicio', format(addDays(parseISO(maxDate), 1), 'yyyy-MM-dd'))
      .gte('data_fim', format(addDays(parseISO(minDate), -1), 'yyyy-MM-dd'));
    
    if (searchError) {
      console.error('Error searching blocks:', searchError);
      continue;
    }

    // Check if dates are already fully covered by existing block
    const isAlreadyCovered = existingBlocks?.some(block => 
      minDate >= block.data_inicio && maxDate <= block.data_fim
    );

    if (isAlreadyCovered) {
      // Already covered by existing block, skip
      continue;
    }

    if (existingBlocks && existingBlocks.length > 0) {
      // Expand existing block to cover all dates
      const allDates = [...consecutiveDates];
      existingBlocks.forEach(block => {
        allDates.push(block.data_inicio, block.data_fim);
      });
      allDates.sort();
      const newMinDate = allDates[0];
      const newMaxDate = allDates[allDates.length - 1];

      const { error: updateError } = await supabase
        .from('alocacoes_blocos')
        .update({
          data_inicio: newMinDate,
          data_fim: newMaxDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBlocks[0].id);
      
      if (updateError) {
        console.error('Error updating block:', updateError);
      } else {
        updated++;
      }

      // Delete duplicate overlapping blocks
      if (existingBlocks.length > 1) {
        const idsToDelete = existingBlocks.slice(1).map(b => b.id);
        await supabase
          .from('alocacoes_blocos')
          .delete()
          .in('id', idsToDelete);
      }
    } else {
      // Create new realizado block
      const { error: insertError } = await supabase
        .from('alocacoes_blocos')
        .insert({
          colaborador_id: group.colaborador_id,
          projeto_id: group.projeto_id,
          data_inicio: minDate,
          data_fim: maxDate,
          tipo: 'realizado',
          observacao: 'Criado via puxar apontamentos',
        });
      
      if (insertError) {
        console.error('Error creating block:', insertError);
      } else {
        created++;
      }
    }
  }
}
```

---

## Fluxo Corrigido

```
Lancamentos: [5, 6, 7, 15, 29, 30]

1. Agrupa em consecutivos: [[5,6,7], [15], [29,30]]

2. Para [5,6,7]:
   - Busca blocos adjacentes (4-8 jan)
   - Nenhum encontrado → cria bloco 5-7

3. Para [15]:
   - Busca blocos adjacentes (14-16 jan)
   - Se existe bloco 12-15 → coberto, pula
   - Se existe bloco 14-16 → expande
   - Se nao existe → cria bloco 15-15

4. Para [29,30]:
   - Busca blocos adjacentes (28-31 jan)
   - Nenhum encontrado → cria bloco 29-30

Resultado: 3 blocos separados, datas corretas!
```

---

## Cenario de Teste

Dados:
- Bloco existente: CONRADO + projeto 779, dias 12-15/jan
- Novo lancamento: dia 29/jan, projeto 779 (4h)
- Novo lancamento: dia 29/jan, projeto 26002 (4h)

Resultado esperado:
- Bloco 779 (12-15): mantido
- Bloco 779 (29): CRIADO (novo)
- Bloco 26002 (29): CRIADO (novo)
- Visualizacao: barras empilhadas no dia 29 (stacking)

