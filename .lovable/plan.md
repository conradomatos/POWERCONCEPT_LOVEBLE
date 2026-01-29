
# Correcao: Bugs Criticos no Apontamento de Horas

## Diagnostico dos Bugs

### Problema Raiz
O hook `useApontamentoSimplificado` tem uma arquitetura fragil onde:
1. O estado local (`localChanges`) guarda apenas horas/descricao, sem o `item_id`
2. A funcao `saveBatch` refaz query no banco para buscar `item_id`, criando race conditions
3. Apos salvar, `setLocalChanges({})` limpa tudo antes das queries serem invalidadas
4. A lista `lancamentosDoDia` e um `useMemo` que depende de queries que ainda nao atualizaram

### Bug 1: Segundo projeto desaparece
**Causa:** Ao chamar `addItem` duas vezes, o React pode batchear as atualizacoes de `localChanges`. Alem disso, o `saveBatch` limpa `localChanges` antes de `queryClient.invalidateQueries` terminar.

### Bug 2: Edicao de horas nao persiste
**Causa:** Quando edita um item existente, `setHoras` cria entrada em `localChanges`. Porem, o `saveBatch` busca `existingItemId` de uma nova query (`currentItems`), que pode nao retornar o mesmo resultado por timing.

### Bug 3: Exclusao nao funciona
**Causa:** `markedForDeletion` e setado, mas apos limpar `localChanges` no `onSuccess`, a query invalidada retorna os dados originais (que ainda existem no banco se o delete falhou ou nao foi processado).

---

## Solucao: Reescrever com Estado Unificado

Vou reescrever o hook com uma nova arquitetura mais robusta:

### Nova Estrutura de Dados

```typescript
interface ApontamentoItemLocal {
  id?: string;              // UUID se existe no banco
  projeto_id: string;
  projeto_os: string;
  projeto_nome: string;
  is_sistema: boolean;
  horas: number;
  descricao: string | null;
  status: 'unchanged' | 'new' | 'modified' | 'deleted';
}

// Estado unico - nao depende de useMemo
const [items, setItems] = useState<ApontamentoItemLocal[]>([]);
const [initialized, setInitialized] = useState(false);
```

### Fluxo de Inicializacao

1. Buscar `apontamento_dia` existente (se houver)
2. Buscar `apontamento_item` para esse dia
3. Mesclar com projetos para ter os nomes
4. Popular o estado `items` com status `'unchanged'`
5. Marcar `initialized = true`

### Funcoes de Manipulacao

| Funcao | Comportamento |
|--------|---------------|
| `addItem` | Adiciona item com `status: 'new'` |
| `setHoras` | Se `new` mantem `new`, senao muda para `modified` |
| `setDescricao` | Mesmo comportamento |
| `removeItem` | Se `new` remove do array, senao muda para `deleted` |

### Funcao saveAll

```typescript
const saveAll = async () => {
  // 1. Garante apontamento_dia existe (upsert)
  // 2. Para cada item no estado:
  //    - status === 'new': INSERT
  //    - status === 'modified': UPDATE usando id
  //    - status === 'deleted' && id existe: DELETE usando id
  //    - status === 'unchanged': ignorar
  // 3. Recarregar dados frescos do banco
  // 4. Atualizar estado local com novos dados
}
```

### Lista para Exibicao

```typescript
const lancamentosVisiveis = items.filter(i => i.status !== 'deleted');
```

### Projetos Disponiveis

```typescript
const projetosDisponiveis = projetosAtivos.filter(
  p => !items.some(i => i.projeto_id === p.id && i.status !== 'deleted')
);
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useApontamentoSimplificado.ts` | Reescrever completamente com nova arquitetura |
| `src/components/apontamento/ApontamentoDesktop.tsx` | Ajustar para mostrar descricao na linha + usar novas props |
| `src/components/apontamento/ApontamentoMobile.tsx` | Ajustar para mostrar descricao na linha |

---

## Implementacao Detalhada do Hook

### 1. Interfaces

```typescript
type ItemStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

interface ApontamentoItemLocal {
  id?: string;
  projeto_id: string;
  projeto_os: string;
  projeto_nome: string;
  is_sistema: boolean;
  horas: number;
  descricao: string | null;
  status: ItemStatus;
}

interface DiaInfo {
  id: string;
  colaborador_id: string;
  data: string;
}
```

### 2. Estados

```typescript
const [items, setItems] = useState<ApontamentoItemLocal[]>([]);
const [diaInfo, setDiaInfo] = useState<DiaInfo | null>(null);
const [isInitialized, setIsInitialized] = useState(false);
const [isSaving, setIsSaving] = useState(false);
```

### 3. Inicializacao (useEffect)

```typescript
useEffect(() => {
  if (!colaboradorId || !data || !projetos) return;
  
  const loadData = async () => {
    // 1. Buscar apontamento_dia
    const { data: dia } = await supabase
      .from('apontamento_dia')
      .select('id, colaborador_id, data')
      .eq('colaborador_id', colaboradorId)
      .eq('data', data)
      .maybeSingle();
    
    setDiaInfo(dia);
    
    if (!dia) {
      setItems([]);
      setIsInitialized(true);
      return;
    }
    
    // 2. Buscar items existentes
    const { data: existingItems } = await supabase
      .from('apontamento_item')
      .select('id, projeto_id, horas, descricao')
      .eq('apontamento_dia_id', dia.id);
    
    // 3. Mesclar com projetos
    const loadedItems: ApontamentoItemLocal[] = (existingItems || []).map(item => {
      const projeto = projetos.find(p => p.id === item.projeto_id);
      return {
        id: item.id,
        projeto_id: item.projeto_id,
        projeto_os: projeto?.os || '',
        projeto_nome: projeto?.nome || '',
        is_sistema: projeto?.is_sistema || false,
        horas: item.horas,
        descricao: item.descricao,
        status: 'unchanged' as const,
      };
    });
    
    setItems(loadedItems);
    setIsInitialized(true);
  };
  
  loadData();
}, [colaboradorId, data, projetos]);
```

### 4. Funcao addItem

```typescript
const addItem = useCallback((projetoId: string, horas: number, descricao?: string | null) => {
  const projeto = projetos?.find(p => p.id === projetoId);
  if (!projeto) return;
  
  setItems(prev => [
    ...prev,
    {
      projeto_id: projetoId,
      projeto_os: projeto.os,
      projeto_nome: projeto.nome,
      is_sistema: projeto.is_sistema || false,
      horas,
      descricao: descricao ?? null,
      status: 'new',
    },
  ]);
}, [projetos]);
```

### 5. Funcao setHoras

```typescript
const updateHoras = useCallback((projetoId: string, horas: number | null) => {
  setItems(prev => prev.map(item => {
    if (item.projeto_id !== projetoId) return item;
    return {
      ...item,
      horas: horas ?? 0,
      status: item.status === 'new' ? 'new' : 'modified',
    };
  }));
}, []);
```

### 6. Funcao removeItem

```typescript
const removeItem = useCallback((projetoId: string) => {
  setItems(prev => {
    const item = prev.find(i => i.projeto_id === projetoId);
    if (!item) return prev;
    
    // Se e novo (sem id), remove do array
    if (item.status === 'new' || !item.id) {
      return prev.filter(i => i.projeto_id !== projetoId);
    }
    
    // Se existe no banco, marca para deletar
    return prev.map(i => 
      i.projeto_id === projetoId 
        ? { ...i, status: 'deleted' as const }
        : i
    );
  });
}, []);
```

### 7. Funcao saveAll

```typescript
const saveAll = useCallback(async () => {
  if (!colaboradorId) return;
  
  setIsSaving(true);
  
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    // 1. Garantir apontamento_dia existe
    let diaId = diaInfo?.id;
    
    if (!diaId) {
      const { data: newDia, error } = await supabase
        .from('apontamento_dia')
        .insert({
          colaborador_id: colaboradorId,
          data,
          status: 'RASCUNHO',
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();
      
      if (error) throw error;
      diaId = newDia.id;
    }
    
    // 2. Processar cada item
    for (const item of items) {
      if (item.status === 'new') {
        // INSERT
        await supabase.from('apontamento_item').insert({
          apontamento_dia_id: diaId,
          projeto_id: item.projeto_id,
          horas: item.horas,
          descricao: item.descricao,
          tipo_hora: 'NORMAL',
          is_overhead: item.is_sistema,
          created_by: userId,
          updated_by: userId,
        });
      } else if (item.status === 'modified' && item.id) {
        // UPDATE
        await supabase.from('apontamento_item')
          .update({
            horas: item.horas,
            descricao: item.descricao,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      } else if (item.status === 'deleted' && item.id) {
        // DELETE
        await supabase.from('apontamento_item')
          .delete()
          .eq('id', item.id);
      }
    }
    
    // 3. Recarregar dados frescos
    const { data: freshItems } = await supabase
      .from('apontamento_item')
      .select('id, projeto_id, horas, descricao')
      .eq('apontamento_dia_id', diaId);
    
    // 4. Atualizar estado local
    const newItems: ApontamentoItemLocal[] = (freshItems || []).map(item => {
      const projeto = projetos?.find(p => p.id === item.projeto_id);
      return {
        id: item.id,
        projeto_id: item.projeto_id,
        projeto_os: projeto?.os || '',
        projeto_nome: projeto?.nome || '',
        is_sistema: projeto?.is_sistema || false,
        horas: item.horas,
        descricao: item.descricao,
        status: 'unchanged' as const,
      };
    });
    
    setItems(newItems);
    setDiaInfo({ id: diaId, colaborador_id: colaboradorId, data });
    
    toast.success('Horas salvas com sucesso!');
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    toast.error('Erro ao salvar horas');
  } finally {
    setIsSaving(false);
  }
}, [colaboradorId, data, diaInfo, items, projetos]);
```

### 8. Valores Derivados

```typescript
// Lista visivel (sem deletados)
const lancamentosVisiveis = useMemo(() => 
  items.filter(i => i.status !== 'deleted').sort((a, b) => a.projeto_os.localeCompare(b.projeto_os)),
  [items]
);

// Projetos disponiveis
const projetosDisponiveis = useMemo(() => {
  if (!projetos) return [];
  const usedIds = new Set(items.filter(i => i.status !== 'deleted').map(i => i.projeto_id));
  return projetos.filter(p => !usedIds.has(p.id));
}, [projetos, items]);

// Total de horas
const totalHoras = useMemo(() => 
  lancamentosVisiveis.reduce((sum, i) => sum + i.horas, 0),
  [lancamentosVisiveis]
);

// Tem mudancas?
const hasChanges = useMemo(() => 
  items.some(i => i.status !== 'unchanged'),
  [items]
);
```

---

## Mudancas na UI

### Mostrar Descricao na Linha

Quando um item tem descricao preenchida, mostrar um preview truncado na linha:

```tsx
<TableCell className="font-medium">
  <div>
    <span className="text-muted-foreground mr-2 font-mono text-sm">
      {item.projeto_os}
    </span>
    {item.projeto_nome}
    {item.descricao && (
      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
        {item.descricao}
      </p>
    )}
  </div>
</TableCell>
```

---

## Testes Esperados Apos Correcao

| Cenario | Resultado Esperado |
|---------|-------------------|
| Adicionar 2 projetos, Salvar, Recarregar | Ambos aparecem |
| Editar horas, Salvar, Recarregar | Novo valor persiste |
| Excluir item, Salvar, Recarregar | Item nao aparece mais |
| Adicionar + Editar + Excluir, Salvar | Tudo correto |
| Adicionar item com descricao | Descricao aparece na linha |

---

## Resumo das Mudancas

1. **Hook reescrito** com estado unificado e status por item
2. **Sem dependencia de useQuery** para items - carrega uma vez e gerencia localmente
3. **saveAll sincrono** - processa todos os items em sequencia
4. **Recarga pos-save** - busca dados frescos e atualiza estado
5. **UI mostra descricao** na linha do item
