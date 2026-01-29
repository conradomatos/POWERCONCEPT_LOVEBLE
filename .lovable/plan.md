

## Plano: Pré-Seleção Automática do Colaborador por Usuário Logado

### Problema
Atualmente na tela de Apontamento Diário, o usuário precisa selecionar manualmente o colaborador. Seria muito mais rápido se o sistema pré-selecionasse automaticamente o colaborador correspondente ao usuário logado.

### Análise do Estado Atual

**Tabelas envolvidas:**
| Tabela | Campos relevantes | Status |
|--------|-------------------|--------|
| `auth.users` | `id`, `email` | Gerenciada pelo Supabase Auth |
| `profiles` | `user_id`, `email`, `full_name` | Sincronizada com auth.users |
| `collaborators` | `id`, `email`, `cpf`, `full_name` | Cadastro de colaboradores |

**Situação atual dos dados:**
- Usuário `conradodematos@gmail.com` logado (profile)
- Colaborador "CONRADO MATOS" tem email `conrado@conceptengenharia.com.br`
- Os emails são **diferentes**, então não há match automático possível

### Solução Proposta

#### Fase 1: Adicionar campo `user_id` na tabela `collaborators`

Criar uma coluna `user_id` que faz referência direta ao usuário do sistema, permitindo o vínculo explícito.

**Migração SQL:**
```sql
ALTER TABLE public.collaborators
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_collaborators_user_id ON public.collaborators(user_id);

COMMENT ON COLUMN public.collaborators.user_id IS 'Vínculo com usuário do sistema para auto-seleção';
```

#### Fase 2: Modificar `ApontamentoDiario.tsx`

Adicionar lógica para buscar o colaborador vinculado ao usuário logado:

```typescript
// Novo useEffect para auto-selecionar colaborador
useEffect(() => {
  // Só pré-seleciona se:
  // 1. Não veio colaborador por URL
  // 2. Usuário está logado
  // 3. Lista de colaboradores carregou
  // 4. Ainda não há seleção
  if (!colaboradorIdParam && user && colaboradores && !selectedColaborador) {
    const meuColaborador = colaboradores.find(c => c.user_id === user.id);
    if (meuColaborador) {
      setSelectedColaborador(meuColaborador.id);
    }
  }
}, [colaboradorIdParam, user, colaboradores, selectedColaborador]);
```

#### Fase 3: Interface de Vinculação (Tela de Colaboradores)

Adicionar opção para vincular usuário ao colaborador na tela `/collaborators`:

- Novo campo "Usuário do Sistema" no formulário de edição
- Dropdown mostrando usuários disponíveis (que ainda não estão vinculados)
- Permitir desvincular (setar como null)

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Adicionar coluna `user_id` em `collaborators` |
| `src/pages/ApontamentoDiario.tsx` | Lógica de auto-seleção por `user_id` |
| `src/pages/Collaborators.tsx` | Buscar `user_id` na query |
| `src/components/CollaboratorForm.tsx` | Adicionar campo para vincular usuário |

### Detalhes Técnicos

#### Migração de Banco de Dados
```sql
-- Adicionar coluna user_id para vínculo com auth.users
ALTER TABLE public.collaborators
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índice para buscas rápidas
CREATE INDEX idx_collaborators_user_id ON public.collaborators(user_id);

-- Constraint para garantir vínculo único (1 usuário = 1 colaborador)
ALTER TABLE public.collaborators
ADD CONSTRAINT collaborators_user_id_unique UNIQUE (user_id);
```

#### Query para dropdown de usuários no formulário
```typescript
const { data: availableUsers } = useQuery({
  queryKey: ['available-users', currentCollaboratorId],
  queryFn: async () => {
    // Buscar todos os profiles (usuários)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email');
    
    // Buscar colaboradores já vinculados
    const { data: linked } = await supabase
      .from('collaborators')
      .select('user_id')
      .not('user_id', 'is', null)
      .neq('id', currentCollaboratorId); // Excluir o próprio
    
    const linkedIds = linked?.map(c => c.user_id) || [];
    
    // Retornar apenas usuários não vinculados
    return profiles?.filter(p => !linkedIds.includes(p.user_id)) || [];
  }
});
```

#### Auto-seleção no ApontamentoDiario.tsx (linhas 75-90)
```typescript
// Adicionar user_id na query de colaboradores
const { data: colaboradores } = useQuery({
  queryKey: ['colaboradores-lista'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('collaborators')
      .select('id, full_name, cpf, equipe, user_id') // ADICIONAR user_id
      .eq('status', 'ativo')
      .order('full_name');
    if (error) throw error;
    return data;
  },
  enabled: canAccess,
});

// Novo useEffect para auto-seleção
useEffect(() => {
  if (!colaboradorIdParam && user && colaboradores && !selectedColaborador) {
    const meuColaborador = colaboradores.find(c => c.user_id === user.id);
    if (meuColaborador) {
      setSelectedColaborador(meuColaborador.id);
    }
  }
}, [colaboradorIdParam, user, colaboradores, selectedColaborador]);
```

### Fluxo do Usuário Final

1. **Administrador** acessa `/collaborators` e edita "CONRADO MATOS"
2. Seleciona o usuário "Conrado (conradodematos@gmail.com)" no dropdown
3. Salva o vínculo
4. **Conrado** acessa `/apontamento-diario`
5. O sistema detecta o vínculo e pré-seleciona automaticamente
6. Conrado pode começar a lançar horas imediatamente

### Vantagens

- Vínculo explícito e seguro (não depende de emails iguais)
- 1:1 garantido (constraint UNIQUE)
- Fácil de desfazer/refazer pelo admin
- Fallback: se não houver vínculo, funciona como antes (seleção manual)

