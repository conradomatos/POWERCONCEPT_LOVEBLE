

# Diagnostico: Bug de Drag-and-Drop Nao Persiste

## Causa Raiz Identificada

O problema **NAO esta no drag-and-drop**, mas sim na **sequencia de eventos que ocorre apos o drag**:

1. Usuario arrasta bloco → `handleResizeBlock` ou `handleMoveBlock` e chamado com datas CORRETAS
2. Supabase atualiza o banco corretamente (PATCH retorna 200/204)
3. `queryClient.invalidateQueries` dispara refetch
4. **AO CLICAR NO BLOCO**, `onEditBlock` e disparado e abre o modal
5. **PROBLEMA**: O modal recebe `editingBlock` que ainda contem as datas ANTIGAS do estado React (nao refletiu o refetch ainda)
6. Usuario clica "Atualizar" no modal → sobrescreve com datas antigas

---

## Fluxo Detalhado do Bug

```text
[1] Drag-and-drop conclui
    ↓
[2] handleResizeBlock(blockId, newStart, newEnd)
    ↓
[3] Supabase PATCH → banco atualizado ✓
    ↓
[4] queryClient.invalidateQueries → dispara refetch assincrono
    ↓
[5] SIMULTANEAMENTE: evento onClick dispara handleEditBlock(block)
    ↓
[6] setEditingBlock(block) → block ainda tem datas antigas (da lista antes do refetch)
    ↓
[7] Modal abre com datas antigas
    ↓
[8] Usuario clica Atualizar → envia datas antigas para o banco
    ↓
[9] Datas "voltam" para o valor original ✗
```

---

## Evidencia nos Logs

O log `Drag resize update` mostra datas CORRETAS sendo enviadas:
```json
{
  "id": "4bc71ae2-...",
  "original": { "inicio": "2026-01-05", "fim": "2026-01-09" },
  "novo": { "inicio": "2026-01-05", "fim": "2026-01-07" }
}
```

Mas a resposta do banco mostra que as datas foram atualizadas:
```json
{
  "data_inicio": "2026-01-05",
  "data_fim": "2026-01-07"  // <- Correto no banco!
}
```

O problema e que o usuario abre o modal e ve `05/01 a 09/01` porque o `editingBlock` foi setado ANTES do refetch completar.

---

## Solucao Proposta

### Opcao A: Impedir click apos drag (Recomendada)

Adicionar flag para distinguir fim de drag de click intencional:

**GanttChart.tsx - handleMouseUp:**
```typescript
const [justFinishedDrag, setJustFinishedDrag] = useState(false);

const handleMouseUp = useCallback(() => {
  if (!dragState) return;
  
  // ... logica existente de move/resize ...
  
  // Marcar que acabou de fazer drag
  if (dragState.type !== 'create') {
    setJustFinishedDrag(true);
    setTimeout(() => setJustFinishedDrag(false), 200);
  }
  
  setDragState(null);
}, [/* deps */]);

// No onClick do bloco:
onClick={(e) => {
  if (!dragState && !justFinishedDrag) {
    e.stopPropagation();
    onEditBlock(block);
  }
}}
```

### Opcao B: Sincronizar modal com dados frescos

Buscar dados atualizados do banco ao abrir modal:

**Planejamento.tsx - handleEditBlock:**
```typescript
const handleEditBlock = async (block: Block) => {
  // Buscar dados mais recentes do banco antes de abrir modal
  const { data } = await supabase
    .from('alocacoes_blocos')
    .select('*')
    .eq('id', block.id)
    .single();
  
  if (data) {
    setEditingBlock({
      ...block,
      data_inicio: data.data_inicio,
      data_fim: data.data_fim,
    });
  } else {
    setEditingBlock(block);
  }
  setDefaultFormData({});
  setIsFormOpen(true);
};
```

### Opcao C: Desabilitar click durante drag (mais simples)

Verificar se houve movimento antes de permitir click:

```typescript
onClick={(e) => {
  // So abre modal se nao houve movimento (drag/resize)
  const isRealClick = !dragState && 
    dragState?.startDayIndex === dragState?.currentDayIndex;
  if (isRealClick) {
    e.stopPropagation();
    onEditBlock(block);
  }
}}
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/GanttChart.tsx` | Adicionar flag `justFinishedDrag` e logica de debounce |

---

## Implementacao Recomendada

A **Opcao A** e a mais robusta porque:
- Nao adiciona latencia (nao precisa buscar do banco)
- Resolve a causa raiz (evento conflitante)
- Simples de implementar

Codigo final:

```typescript
// Estado para evitar click imediato apos drag
const [justFinishedDrag, setJustFinishedDrag] = useState(false);

const handleMouseUp = useCallback(() => {
  if (!dragState) return;

  const { type, colaboradorId, blockId, startDayIndex, currentDayIndex, originalStart, originalEnd } = dragState;
  
  // Se houve movimento (drag/resize), marcar flag para impedir click
  const hasMoved = startDayIndex !== currentDayIndex;
  
  if (type === 'create') {
    // ... logica existente ...
  } else if (hasMoved) {
    // Processar move/resize normalmente
    if (type === 'move' && blockId && originalStart && originalEnd && onMoveBlock) {
      // ... logica existente ...
    } else if (type === 'resize-left' && /* ... */) {
      // ... logica existente ...
    } else if (type === 'resize-right' && /* ... */) {
      // ... logica existente ...
    }
    
    // Impedir click por 300ms apos drag
    setJustFinishedDrag(true);
    setTimeout(() => setJustFinishedDrag(false), 300);
  }

  setDragState(null);
}, [dragState, period.days, onCreateBlock, onMoveBlock, onResizeBlock]);

// No onClick do bloco:
onClick={(e) => {
  if (!dragState && !justFinishedDrag) {
    e.stopPropagation();
    onEditBlock(block);
  }
}}
```

---

## Teste de Validacao

Apos implementar:

1. Arrastar bloco para nova posicao
2. Verificar toast "Alocacao movida/redimensionada com sucesso"
3. Modal NAO deve abrir automaticamente
4. Clicar novamente no bloco apos 1 segundo
5. Modal deve mostrar datas NOVAS (atualizadas)
6. Verificar banco - datas devem estar corretas

