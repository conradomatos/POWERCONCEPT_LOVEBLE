
# Plano: Visualizacao de Rateio com Barras Empilhadas no Gantt

## Problema Identificado

Quando um colaborador tem horas em multiplos projetos no mesmo dia:
- O sistema cria blocos separados corretamente (um por projeto)
- Porem, o GanttChart renderiza todos os blocos na mesma posicao vertical
- Resultado: blocos sobrepostos, visualmente parece haver apenas 1 bloco

### Exemplo do Problema
```
Dia 30/01 - CONRADO:
  Atual:    [████ BRASCARGO + ADMINISTRATIVO sobrepostos ████]
  Esperado: [████ ADMINISTRATIVO 4h ████]
            [████ BRASCARGO 4h ████]  <- empilhado abaixo
```

---

## Solucao Proposta

Implementar barras empilhadas (stacked bars) no estilo Primavera P6.

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/GanttChart.tsx` | Adicionar logica de stacking e altura dinamica |
| `src/lib/gantt-utils.ts` | Adicionar funcao para calcular indices de empilhamento |

---

## Detalhamento Tecnico

### 1. Nova Funcao em `gantt-utils.ts`

Adicionar funcao para calcular o indice de empilhamento de cada bloco:

```typescript
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
  
  // Para cada dia, encontrar quais blocos estao ativos
  const dayBlocksMap = new Map<string, Block[]>();
  
  for (const day of periodDays) {
    const dayStr = format(day, 'yyyy-MM-dd');
    const activeBlocks = colBlocks.filter(block => {
      const start = parseISO(block.data_inicio);
      const end = parseISO(block.data_fim);
      return day >= start && day <= end;
    });
    dayBlocksMap.set(dayStr, activeBlocks);
  }
  
  // Atribuir stackIndex consistente para cada bloco
  const blockStackInfo = new Map<string, { index: number; total: number }>();
  
  for (const [dayStr, dayBlocks] of dayBlocksMap) {
    if (dayBlocks.length <= 1) continue;
    
    // Ordenar por projeto_id para consistencia
    const sorted = [...dayBlocks].sort((a, b) => 
      a.projeto_id.localeCompare(b.projeto_id)
    );
    
    sorted.forEach((block, idx) => {
      const existing = blockStackInfo.get(block.id);
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
```

### 2. Modificar `GanttChart.tsx`

#### 2.1 Usar blocos empilhados

Trocar o filtro simples por calculo de stacking:

```typescript
// ANTES (linha 303)
const colBlocks = blocks.filter((b) => b.colaborador_id === col.id);

// DEPOIS
const colBlocks = useMemo(() => 
  calculateStackedBlocks(blocks, col.id, period.days),
  [blocks, col.id, period.days]
);
```

#### 2.2 Calcular altura dinamica da linha

```typescript
// Calcular max stacks para altura da linha
const maxStacks = Math.max(1, ...colBlocks.map(b => b.stackTotal));
const rowHeight = 40 + (maxStacks - 1) * 24; // Base 40px + 24px por stack adicional
```

#### 2.3 Posicionar blocos verticalmente

```typescript
// ANTES (estilo fixo)
className="absolute top-2 bottom-2 ..."

// DEPOIS (posicao dinamica baseada no stackIndex)
const blockHeight = maxStacks > 1 ? (rowHeight - 8) / maxStacks : rowHeight - 8;
const blockTop = 4 + (block.stackIndex * blockHeight);

style={{
  top: `${blockTop}px`,
  height: `${blockHeight - 2}px`,
  ...
}}
```

#### 2.4 Altura dinamica da linha

```typescript
// ANTES
<div key={col.id} className="flex h-14 ...">

// DEPOIS
<div key={col.id} 
  className="flex transition-all ..."
  style={{ height: `${rowHeight}px` }}
>
```

---

## Fluxo Visual do Resultado

```
Antes (blocos sobrepostos):
+------------------------------------------+
| CONRADO  | [████ PROJ1+PROJ2 ████]       |
+------------------------------------------+

Depois (barras empilhadas):
+------------------------------------------+
| CONRADO  | [████ ADMINISTRATIVO ████]    |
|          | [████ BRASCARGO ████████]     |
+------------------------------------------+
```

---

## Estimativa de Complexidade

| Tarefa | Linhas | Complexidade |
|--------|--------|--------------|
| Funcao `calculateStackedBlocks` | ~40 | Media |
| Modificar GanttChart | ~30 | Media |
| Ajustar estilos/altura dinamica | ~20 | Baixa |

**Total**: ~90 linhas de codigo modificadas/adicionadas

---

## Testes

1. Lancar 4h em ADMINISTRATIVO + 4h em BRASCARGO para mesmo colaborador/dia
2. Ir em Planejamento Gantt → Clicar "Puxar Apontamentos"
3. Verificar: duas barras empilhadas verticalmente, cada uma com sua cor
4. Hover em cada barra → tooltip mostra projeto correto
5. Testar navegacao entre semanas/meses → layout deve se manter

---

## Consideracoes Adicionais

- A logica de drag/drop e resize continuara funcionando normalmente
- O context menu (clique direito) funcionara em cada barra individualmente
- A cor de cada barra sera determinada pelo `projeto_id` (ja implementado)
- Blocos "realizado" (borda tracejada) serao empilhados da mesma forma
