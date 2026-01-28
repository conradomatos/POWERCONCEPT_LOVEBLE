
## Plano: Correção dos Filtros na Página de Colaboradores

### Problema Identificado
A página de Colaboradores (`/collaborators`) apresenta dois problemas:
1. **Busca não funciona corretamente** - O texto digitado não filtra os resultados
2. **Status não mantém seleção** - Ao selecionar um status, o valor não persiste visualmente

### Análise Técnica

#### Causa Raiz
1. **Tipagem desatualizada**: O código usa `(c as any).equipe` em múltiplos lugares quando o campo `equipe` já existe oficialmente no tipo `Collaborator`
2. **Comparação de valores nulos**: Campos como `department`, `position` e `equipe` podem ser `null`, e a chamada `.toLowerCase()` em valores nulos causa erro silencioso
3. **Performance**: O cálculo de `uniqueEquipes` é refeito a cada render, o que pode causar problemas de estado

### Solução Proposta

#### 1. Corrigir a lógica de busca (segurança contra null)
```typescript
const filteredCollaborators = useMemo(() => {
  const searchLower = search.toLowerCase().trim();
  
  return collaborators.filter((c) => {
    // Busca segura com verificação de null
    const matchesSearch = searchLower === '' || 
      c.full_name.toLowerCase().includes(searchLower) ||
      c.cpf.includes(search.replace(/\D/g, '')) ||
      (c.department?.toLowerCase().includes(searchLower) ?? false) ||
      (c.position?.toLowerCase().includes(searchLower) ?? false) ||
      (c.equipe?.toLowerCase().includes(searchLower) ?? false);

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesEquipe = equipeFilter === 'all' || c.equipe === equipeFilter;

    return matchesSearch && matchesStatus && matchesEquipe;
  });
}, [collaborators, search, statusFilter, equipeFilter]);
```

#### 2. Otimizar cálculo de equipes únicas com useMemo
```typescript
const uniqueEquipes = useMemo(() => 
  [...new Set(collaborators.map(c => c.equipe).filter(Boolean))].sort() as string[],
  [collaborators]
);
```

#### 3. Remover todas as ocorrências de `(c as any).equipe`
Substituir por acesso direto `c.equipe` já que o campo existe no tipo.

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Collaborators.tsx` | Corrigir lógica de filtros, adicionar `useMemo`, remover type casting |

### Detalhes Técnicos

**Linha 27-29**: Manter estados como estão (corretos)

**Linha 62**: Adicionar `useMemo` para `uniqueEquipes`

**Linha 64-76**: Refatorar `filteredCollaborators`:
- Envolver em `useMemo` com dependências corretas
- Adicionar verificações de null com operador `??`
- Remover `(c as any)` e acessar `c.equipe` diretamente

**Linhas 70, 73, 215, 326**: Trocar `(c as any).equipe` por `c.equipe`

### Impacto
- Zero impacto em outras funcionalidades
- Melhoria de performance com `useMemo`
- Código mais limpo sem type casting desnecessário
