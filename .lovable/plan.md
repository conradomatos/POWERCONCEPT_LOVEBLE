
# Redesign: Apontamento de Horas Simplificado

## Resumo da Proposta

Transformar o apontamento de horas de um sistema complexo com múltiplos campos em uma interface ultra-simplificada, focada em velocidade e usabilidade. O objetivo é que um colaborador consiga registrar suas horas em menos de 10 segundos.

---

## Mudancas Principais

| Elemento | Situacao Atual | Nova Implementacao |
|----------|----------------|-------------------|
| Tipo de Hora | Dropdown obrigatorio (6 opcoes) | Removido - sempre "NORMAL" |
| Base do Dia | Editavel pelo usuario | Removido da interface |
| Enviar para Aprovacao | Fluxo completo | Removido - salva direto |
| Descricao | Campo visivel | Oculto com icone expansivel |
| Layout | Unico para todos | Mobile-first + Desktop para gestores |
| Seletor de Projetos | Dropdown individual | Lista de cards com input direto |

---

## Arquitetura de Componentes

```text
src/pages/
  ApontamentoDiario.tsx          -- Componente principal (roteador)
  
src/components/apontamento/
  ApontamentoMobile.tsx          -- Layout mobile (colaboradores)
  ApontamentoDesktop.tsx         -- Layout desktop (gestores)
  ProjetoCard.tsx                -- Card de projeto com input de horas
  HorasInput.tsx                 -- Input numerico otimizado para mobile
```

---

## 1. VERSAO MOBILE (Colaboradores)

### Design da Interface

**Header fixo:**
- Seta voltar + "Apontamento" + Data formatada
- Navegacao de dias (setas < >)

**Lista de Projetos:**
- Cada projeto ativo e um card
- Mostra: icone + OS + nome do projeto
- Campo de horas a direita (input numerico grande)
- Icone de nota (expande textarea inline)
- Projetos COM horas ficam destacados (borda amarela/dourada)

**Footer fixo:**
- Total do dia em tempo real
- Botao "Salvar" grande e centralizado

### Comportamento

1. Ao abrir: lista TODOS os projetos ativos
2. Colaborador digita horas diretamente no campo de cada projeto
3. Total atualiza em tempo real
4. Botao Salvar: upsert em batch de todos os items
5. Feedback: toast de sucesso + icone check verde nos projetos salvos

### Tecnico

```typescript
// useApontamentoSimplificado - novo hook
// - Busca todos projetos ativos
// - Mantem estado local de horas por projeto
// - Funcao saveBatch que faz upsert de todos items de uma vez
// - Auto-cria apontamento_dia se nao existir
```

---

## 2. VERSAO DESKTOP (Gestores)

### Design da Interface

**Cabecalho:**
- Titulo "Apontamento de Horas"
- Seletor de colaborador (dropdown com busca)
- Opcao de selecionar multiplos colaboradores
- Date picker + botoes "Hoje", "Ontem"

**Tabela de Projetos:**
| Projeto | Horas | Nota |
|---------|-------|------|
| 0001 - Obra Centro | [input] | icone |
| 0002 - Administrativo | [input] | icone |
| ... | ... | ... |

**Rodape:**
- Total de horas
- Botao Salvar

### Comportamento

1. Se multiplos colaboradores selecionados: aplica mesmas horas para todos
2. Auto-save com debounce de 2 segundos ao sair do campo
3. Indicador visual de "salvando..." e "salvo"

---

## 3. AJUSTES NO BANCO DE DADOS

### Migration Necessaria

```sql
-- Tornar tipo_hora opcional com default NORMAL
-- (ja esta assim: column_default:'NORMAL'::tipo_hora_ext)

-- Nao ha mudancas estruturais necessarias
-- tipo_hora ja tem default 'NORMAL'
-- descricao ja e nullable
-- status ja tem default 'RASCUNHO'
```

**Boa noticia:** O schema atual ja suporta a simplificacao! Nenhuma migration necessaria.

---

## 4. LOGICA DE NEGOCIO

### Novo Hook: useApontamentoSimplificado

```typescript
interface ProjetoComHoras {
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  is_sistema: boolean;
  horas: number | null;
  descricao: string | null;
  item_id: string | null;  // null = novo, uuid = existente
  changed: boolean;
}

function useApontamentoSimplificado(colaboradorId: string, data: string) {
  // 1. Busca projetos ativos
  // 2. Busca items existentes para o dia
  // 3. Mescla em uma lista unica
  // 4. Retorna lista e funcao saveBatch
}
```

### Funcao saveBatch

```typescript
async function saveBatch(items: ProjetoComHoras[]) {
  // 1. Garante que apontamento_dia existe (upsert)
  // 2. Para cada item com horas > 0:
  //    - Se item_id existe: update
  //    - Se item_id null: insert
  // 3. Para items com horas = 0 e item_id existe: delete
  // 4. Invalida cache e mostra toast
}
```

---

## 5. FILTRO DE PROJETOS

### Versao Atual
Busca todos os projetos sem filtro de status

### Nova Versao
```typescript
const { data: projetos } = useQuery({
  queryKey: ['projetos-ativos'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('projetos')
      .select('id, nome, os, status, is_sistema')
      .eq('status', 'ativo')  // Filtrar apenas ativos
      .order('os', { ascending: true });
    if (error) throw error;
    return data;
  },
});
```

---

## 6. DETECCAO MOBILE vs DESKTOP

Utilizar o hook existente `useIsMobile()`:

```typescript
// src/pages/ApontamentoDiario.tsx
import { useIsMobile } from '@/hooks/use-mobile';

export default function ApontamentoDiario() {
  const isMobile = useIsMobile();
  
  return isMobile 
    ? <ApontamentoMobile /> 
    : <ApontamentoDesktop />;
}
```

---

## 7. DESIGN VISUAL (Dark Theme)

### Card de Projeto
```css
/* Estado normal */
.projeto-card {
  background: #1a1a1a;
  border: 1px solid #2e2e2e;
  border-radius: 12px;
  padding: 12px 16px;
}

/* Com horas preenchidas */
.projeto-card.has-hours {
  border-color: #e5a623;
  background: #1a1a1a;
}

/* Input de horas */
.horas-input {
  width: 60px;
  height: 44px;
  font-size: 18px;
  text-align: center;
  border-radius: 8px;
}
```

### Botao Salvar (Mobile)
```css
.btn-salvar {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  height: 56px;
  background: #e5a623;
  color: black;
  font-weight: 600;
  border-radius: 12px;
}
```

---

## 8. ACESSO E PERMISSOES

### Versao Atual
- Apenas `admin`, `rh`, `super_admin` podem acessar
- RLS permite que qualquer um veja apontamentos

### Nova Versao
- **Mobile:** Todos os usuarios autenticados que tem um colaborador vinculado
- **Desktop:** Apenas `admin`, `rh`, `super_admin`
- RLS ja esta correta para isso

```typescript
// Logica de acesso
const { user, hasRole } = useAuth();
const isGestor = hasRole('admin') || hasRole('rh') || hasRole('super_admin');

// Mobile: usuario ve apenas suas proprias horas (auto-detecta colaborador)
// Desktop: gestor pode ver/editar de qualquer colaborador
```

---

## 9. ARQUIVOS A CRIAR/MODIFICAR

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/pages/ApontamentoDiario.tsx` | Modificar | Roteador mobile/desktop |
| `src/components/apontamento/ApontamentoMobile.tsx` | Criar | Layout mobile completo |
| `src/components/apontamento/ApontamentoDesktop.tsx` | Criar | Layout desktop completo |
| `src/components/apontamento/ProjetoCard.tsx` | Criar | Card reutilizavel |
| `src/hooks/useApontamentoSimplificado.ts` | Criar | Logica de negocios simplificada |
| `src/hooks/useApontamentoDiario.ts` | Manter | Backup, usado pelo desktop |

---

## 10. FLUXO DO USUARIO

### Colaborador (Mobile)

```text
1. Abre app
2. Ve lista de projetos com campos de horas
3. Digita "8" no projeto que trabalhou
4. Toca "Salvar"
5. Ve toast "Horas salvas!"
6. Pronto (tempo total: ~5 segundos)
```

### Gestor (Desktop)

```text
1. Abre pagina de apontamento
2. Seleciona colaborador(es) no dropdown
3. Seleciona data
4. Preenche horas nos campos da tabela
5. Campos salvam automaticamente (auto-save)
   OU clica "Salvar" para confirmar
6. Seleciona proximo colaborador
7. Repete (tempo por colaborador: ~10 segundos)
```

---

## Resultado Esperado

- **UX:** Interface limpa, sem elementos desnecessarios
- **Velocidade:** Lancamento em menos de 10 segundos
- **Mobile-first:** Otimizado para toque e teclado numerico
- **Compatibilidade:** Sem mudancas no banco de dados
- **Seguranca:** RLS existente continua valida
