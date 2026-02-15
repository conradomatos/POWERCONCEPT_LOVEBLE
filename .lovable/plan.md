

# Editor Completo de Agentes v2

## Resumo

Expansao significativa do sistema de agentes com novos campos no banco, editor em abas profissional, payload de chat enriquecido e system prompts detalhados com nomes/personalidades.

---

## 1. Migracao de Banco de Dados

Adicionar 7 novas colunas a tabela `ai_agents`:

```text
knowledge_base       TEXT     NULL
example_responses    TEXT     NULL
model                TEXT     DEFAULT 'gpt-4o'
debate_posture       TEXT     DEFAULT 'critical'
priority_order       INTEGER  DEFAULT 0
tags                 TEXT[]   NULL
max_response_length  TEXT     DEFAULT 'medium'
```

Atualizar os 3 agentes padrao (por slug) com os system prompts completos, knowledge_base, example_responses, tags, temperature, model, debate_posture e max_response_length conforme especificado pelo usuario.

---

## 2. Atualizar tipo AIAgent e hook useAIAgents

**Arquivo:** `src/hooks/ai-lab/useAIAgents.ts`

Adicionar ao interface `AIAgent`:
- `knowledge_base: string | null`
- `example_responses: string | null`
- `model: string`
- `debate_posture: string`
- `priority_order: number`
- `tags: string[] | null`
- `max_response_length: string`

Adicionar funcao `duplicateAgent` que copia um agente com nome "Copia de [nome]".

Atualizar `createAgent` para aceitar todos os novos campos.

---

## 3. Expandir agent-icons.ts

**Arquivo:** `src/lib/agent-icons.ts`

Adicionar 3 novos icones: `gavel` (Gavel), `search` (Search), `alert-triangle` (AlertTriangle) ao mapa e ao array de opcoes.

---

## 4. Reescrever AgentEditor.tsx com Abas

**Arquivo:** `src/pages/ai-lab/AgentEditor.tsx`

Substituir o layout atual de Cards sequenciais por um layout com `Tabs` (5 abas):

**Aba 1 - Identidade:**
- Nome, Slug, Descricao (200 chars com contador)
- Icone (select com 15 opcoes e preview visual)
- Cor (color picker + input hex)
- Tags (input de texto + chips removiveis, sugestoes pre-definidas)
- Ativo/Inativo (switch)
- Preview do card ao final

**Aba 2 - Personalidade:**
- Layout 2 colunas no desktop (md:grid-cols-5, coluna esquerda 3/5, direita 2/5)
- Coluna esquerda: System Prompt (textarea 15 linhas, monospace, contador de caracteres, labels e dicas)
- Coluna direita: Knowledge Base (textarea 10 linhas, monospace, contador, labels e dicas)
- Abaixo (largura total): Example Responses (textarea 8 linhas, monospace, contador, labels e dicas)

**Aba 3 - Parametros Tecnicos:**
- Grid 2x2 de cards:
  - Card 1: Modelo de IA (select: gpt-4o, gpt-4o-mini)
  - Card 2: Temperatura (slider 0-1, step 0.05, labels visuais)
  - Card 3: Tamanho da Resposta (select: short, medium, long, unlimited)
  - Card 4: Postura em Debate (select: aggressive, critical, neutral, collaborative)

**Aba 4 - Acesso e Metadados:**
- Nivel de acesso minimo (select: strategic, tactical, operational)
- Prioridade (number input 0-10)
- Data de criacao (readonly)
- Ultima atualizacao (readonly)

**Aba 5 - Preview e Teste:**
- Campo de teste (textarea)
- Botao "Testar Agente" — envia para `/chat` com system_prompt, knowledge_base, example_responses, temperature, model
- Area de resposta

Botoes "Salvar" e "Cancelar" fixos no bottom (sticky).

---

## 5. Reformular AgentCard.tsx

**Arquivo:** `src/components/ai-lab/AgentCard.tsx`

Cards maiores mostrando:
- Icone colorido, nome, descricao
- Tags como badges
- Modelo, temperatura, postura de debate como badges menores
- Badge de status (Ativo verde, Inativo cinza)
- Botoes: Editar (navega), Duplicar (cria copia), Excluir (com confirmacao)

---

## 6. Atualizar AILabAgents.tsx

**Arquivo:** `src/pages/ai-lab/AILabAgents.tsx`

- Adicionar filtro por tags no topo
- Botao Duplicar por agente
- Confirmacao antes de excluir
- Usar a funcao `duplicateAgent` do hook

---

## 7. Atualizar payload do chat

**Arquivo:** `src/hooks/ai-lab/useAIChat.ts`

Expandir `AgentMeta` interface com todos os novos campos:
- `knowledge_base?: string | null`
- `example_responses?: string | null`
- `model?: string`
- `debate_posture?: string`
- `max_response_length?: string`

No `callAgent`, enviar todos os campos no body (omitir null):

```text
body: {
  message, thread_id, user_id, agent_type,
  system_prompt, knowledge_base, example_responses,
  temperature, model, max_tokens, debate_posture,
  history
}
```

---

## 8. Atualizar AILabChat.tsx

**Arquivo:** `src/pages/ai-lab/AILabChat.tsx`

Passar todos os novos campos do agente no objeto `agentMeta` em `handleSend` e `handleSendRound`.

---

## 9. Resumo de arquivos

| Arquivo | Acao |
|---|---|
| Migration SQL | Novas colunas + update dos 3 agentes padrao |
| `src/hooks/ai-lab/useAIAgents.ts` | Novos campos no tipo + duplicateAgent |
| `src/lib/agent-icons.ts` | 3 novos icones |
| `src/pages/ai-lab/AgentEditor.tsx` | Reescrita completa com 5 abas |
| `src/components/ai-lab/AgentCard.tsx` | Card expandido com tags, modelo, duplicar |
| `src/pages/ai-lab/AILabAgents.tsx` | Filtro por tags, duplicar, confirmacao |
| `src/hooks/ai-lab/useAIChat.ts` | AgentMeta expandido, payload completo |
| `src/pages/ai-lab/AILabChat.tsx` | Passar novos campos no agentMeta |

