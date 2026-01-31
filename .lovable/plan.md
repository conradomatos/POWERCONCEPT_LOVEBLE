
# Plano: Modal de Edicao com Multiplas Alocacoes do Dia

## Resumo

O modal atual de edicao abre para uma alocacao especifica. O novo comportamento mostrara **todas as alocacoes do colaborador que incluem a data clicada**, permitindo editar, excluir ou adicionar novas alocacoes diretamente no mesmo modal.

---

## Arquitetura da Solucao

### Mudanca de Paradigma

**Antes:**
- Clicar em bloco -> `onEditBlock(block)` -> Abre modal com 1 alocacao

**Depois:**
- Clicar em bloco -> `onEditBlock(block, dateClicked)` -> Abre modal mostrando **todas** as alocacoes que incluem aquela data

---

## Componentes a Criar/Modificar

### 1. Novo Componente: `src/components/AlocacoesDiaModal.tsx`

Modal principal que lista todas as alocacoes do dia.

```text
Props:
  - open: boolean
  - onOpenChange: (open: boolean) => void
  - colaboradorId: string
  - colaboradorNome: string
  - dataClicada: Date
  - alocacoes: Block[]           // Todas as alocacoes que incluem a data
  - allProjectIds: string[]      // Para cores
  - onSuccess: () => void        // Refresh apos mudancas
  - canDeleteRealized: boolean   // Permissao de exclusao

Estados internos:
  - editingId: string | null     // ID da alocacao sendo editada inline
  - isAdding: boolean            // Mostrando form de adicionar
  - isDeleting: string | null    // ID sendo excluido (para loading)
```

**Layout do Modal:**

```text
+------------------------------------------+
| Alocacoes de {COLABORADOR}        [X]    |
| Sexta-feira, 31 de Janeiro de 2026       |
+------------------------------------------+
|                                          |
| [Lista de Alocacoes]                     |
|                                          |
| +-Card 1-------------------------------+ |
| | [cor] OS - NOME DO PROJETO           | |
| |       31/01/2026 -> 05/02/2026       | |
| |       Obs: texto...                  | |
| |       [Planejado]  [Editar] [Excluir]| |
| +--------------------------------------+ |
|                                          |
| +-Card 2-------------------------------+ |
| | [cor] OS - NOME DO PROJETO           | |
| |       29/01/2026 -> 31/01/2026       | |
| |       [Realizado] [Editar] [Excluir] | |
| +--------------------------------------+ |
|                                          |
| [+ Adicionar outro projeto neste dia]    |
|                                          |
+------------------------------------------+
|                              [Fechar]    |
+------------------------------------------+
```

### 2. Novo Componente: `src/components/AlocacaoCardItem.tsx`

Card individual para cada alocacao na lista.

```text
Props:
  - alocacao: Block
  - color: string
  - isEditing: boolean
  - onEdit: () => void
  - onDelete: () => void
  - onCancelEdit: () => void
  - onSaveEdit: () => void
  - canDelete: boolean
  - isDeleting: boolean

Estados internos (quando isEditing=true):
  - projetoId, dataInicio, dataFim, observacao
```

**Comportamento:**
- Modo visualizacao: Mostra cor, OS + nome, datas, observacao, badges (Planejado/Realizado), botoes Editar/Excluir
- Modo edicao (isEditing=true): Expande inline com campos editaveis

### 3. Novo Componente: `src/components/AlocacaoAddForm.tsx`

Formulario compacto para adicionar nova alocacao.

```text
Props:
  - colaboradorId: string
  - defaultDataInicio: Date
  - defaultDataFim: Date
  - onSuccess: () => void
  - onCancel: () => void
```

**Campos:**
- Colaborador: readonly (pre-preenchido)
- Projeto: dropdown com busca
- Data Inicio: pre-preenchido com data clicada
- Data Fim: pre-preenchido com data clicada
- Observacao: opcional

### 4. Modificar: `src/components/GanttChart.tsx`

**Alterar assinatura do callback:**

```typescript
// Antes
onEditBlock: (block: Block) => void;

// Depois
onEditBlock: (block: Block, clickedDate: Date) => void;
```

**No onClick do bloco, passar a data clicada:**

```typescript
onClick={(e) => {
  if (!dragState && !justFinishedDrag) {
    e.stopPropagation();
    // Determinar qual dia foi clicado baseado na posicao do mouse
    const rowElement = e.currentTarget.parentElement as HTMLElement;
    const dayIndex = getDayIndexFromEvent(e, rowElement);
    const clickedDate = period.days[dayIndex] || parseISO(block.data_inicio);
    onEditBlock(block, clickedDate);
  }
}}
```

### 5. Modificar: `src/pages/Planejamento.tsx`

**Novos estados:**

```typescript
const [dayModalOpen, setDayModalOpen] = useState(false);
const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
```

**Nova handler:**

```typescript
const handleEditBlock = (block: Block, clickedDate: Date) => {
  // Buscar nome do colaborador
  const colaborador = collaborators.find(c => c.id === block.colaborador_id);
  
  // Filtrar todas as alocacoes desse colaborador que incluem a data clicada
  const alocacoesDoDia = blocks.filter(b =>
    b.colaborador_id === block.colaborador_id &&
    parseISO(b.data_inicio) <= clickedDate &&
    parseISO(b.data_fim) >= clickedDate
  );
  
  setSelectedColaboradorId(block.colaborador_id);
  setSelectedDate(clickedDate);
  setDayModalOpen(true);
};
```

**Substituir o Dialog atual pelo novo modal:**

```tsx
<AlocacoesDiaModal
  open={dayModalOpen}
  onOpenChange={setDayModalOpen}
  colaboradorId={selectedColaboradorId!}
  colaboradorNome={collaborators.find(c => c.id === selectedColaboradorId)?.full_name || ''}
  dataClicada={selectedDate!}
  alocacoes={blocks.filter(b =>
    b.colaborador_id === selectedColaboradorId &&
    selectedDate &&
    parseISO(b.data_inicio) <= selectedDate &&
    parseISO(b.data_fim) >= selectedDate
  )}
  allProjectIds={allProjectIds}
  onSuccess={() => {
    queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
  }}
  canDeleteRealized={isSuperAdmin()}
/>
```

---

## Detalhes Tecnicos

### Logica de Filtragem de Alocacoes

```typescript
// Em Planejamento.tsx ou no modal
const alocacoesDoDia = useMemo(() => {
  if (!selectedColaboradorId || !selectedDate) return [];
  
  return blocks.filter(block => {
    if (block.colaborador_id !== selectedColaboradorId) return false;
    
    const inicio = parseISO(block.data_inicio);
    const fim = parseISO(block.data_fim);
    
    return selectedDate >= inicio && selectedDate <= fim;
  });
}, [blocks, selectedColaboradorId, selectedDate]);
```

### Cores dos Projetos

Reutilizar a funcao existente `getProjectColor` de `gantt-utils.ts`:

```typescript
import { getProjectColor } from '@/lib/gantt-utils';

const color = getProjectColor(alocacao.projeto_id, allProjectIds);
```

### Edicao Inline

Quando usuario clica "Editar" em um card:

1. `setEditingId(alocacao.id)` ativa o modo edicao para aquele card
2. O card expande mostrando inputs para: Projeto, Data Inicio, Data Fim, Observacao
3. Botoes "Salvar" e "Cancelar" aparecem
4. Ao salvar, faz PATCH no Supabase e chama `onSuccess()`

### Exclusao com Confirmacao

Usar o componente `ConfirmDialog` existente:

```typescript
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

// Ao clicar Excluir
setDeleteConfirmId(alocacao.id);

// No ConfirmDialog
<ConfirmDialog
  open={!!deleteConfirmId}
  onOpenChange={() => setDeleteConfirmId(null)}
  title="Excluir Alocacao"
  description={`Excluir alocacao do projeto ${alocacaoParaExcluir?.projeto_os}?`}
  confirmLabel="Excluir"
  variant="destructive"
  isLoading={isDeleting}
  onConfirm={handleDelete}
/>
```

### Validacao de Permissoes

- **Planejado**: Pode ser excluido por admin/rh
- **Realizado**: Pode ser excluido apenas por super_admin

```typescript
const canDelete = alocacao.tipo === 'planejado' || canDeleteRealized;
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/AlocacoesDiaModal.tsx` | Modal principal com lista de alocacoes |
| `src/components/AlocacaoCardItem.tsx` | Card individual com edicao inline |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/GanttChart.tsx` | Alterar assinatura de `onEditBlock` para incluir `clickedDate` |
| `src/pages/Planejamento.tsx` | Substituir modal simples pelo novo `AlocacoesDiaModal`, adicionar novos estados |

---

## Fluxo de Uso

1. Usuario clica em um bloco no Gantt
2. Sistema identifica a data clicada e o colaborador
3. Modal abre mostrando todas as alocacoes que incluem aquela data
4. Usuario pode:
   - **Visualizar**: Ver detalhes de todas as alocacoes sobrepostas
   - **Editar**: Clicar "Editar" expande campos inline, salvar persiste
   - **Excluir**: Clicar "Excluir" abre confirmacao, confirmar remove
   - **Adicionar**: Clicar "+ Adicionar" mostra form com data pre-preenchida
5. Ao fechar modal, Gantt reflete as mudancas

---

## Tratamento de Casos Especiais

### Bloco unico (maioria dos casos)
- Modal mostra apenas 1 card
- UX simples e rapida

### Multiplos blocos sobrepostos
- Modal mostra todos os cards
- Usuario tem visibilidade completa

### Sem alocacoes (apos excluir todas)
- Modal mostra estado vazio: "Nenhuma alocacao neste dia"
- Botao "+ Adicionar" disponivel

### Conflito de datas
- Ao salvar edicao, validar se nao cria overlap com mesmo projeto
- Mostrar toast de erro se houver conflito

---

## Ordem de Implementacao

1. Criar `AlocacaoCardItem.tsx` (card individual)
2. Criar `AlocacoesDiaModal.tsx` (modal com lista)
3. Modificar `GanttChart.tsx` (passar data clicada)
4. Modificar `Planejamento.tsx` (integrar novo modal)
5. Remover codigo do modal antigo (Dialog atual)

---

## Consideracoes de UX

- **Responsividade**: Modal deve funcionar bem em mobile com cards empilhados
- **Cores consistentes**: Usar mesmas cores do Gantt para identificacao visual
- **Feedback visual**: Loading states para operacoes de salvar/excluir
- **Foco automatico**: Ao editar, focar no primeiro campo editavel
- **Scroll**: Se muitas alocacoes, modal tem scroll interno

