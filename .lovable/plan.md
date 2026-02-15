

# Editor Detalhado de Agentes + System Prompts Dinamicos

## Resumo

Tres mudancas principais:
1. Substituir o modal de criacao/edicao de agentes por uma pagina completa e detalhada
2. Enviar `temperature` no payload do chat
3. Atualizar os system prompts dos 3 agentes padrao

---

## 1. Modelo de Dados

### 1.1 Novas colunas em `ai_agents`

```text
temperature FLOAT DEFAULT 0.3
max_tokens INTEGER DEFAULT 2000
```

### 1.2 Atualizar system prompts dos agentes padrao

Via migration SQL, atualizar os 3 agentes existentes (por slug) com os novos system prompts detalhados e temperaturas especificas:
- `default` (Assistente Geral): temperature 0.3
- `engineer` (Engenheiro de Custos): temperature 0.2
- `auditor` (Auditor Fiscal): temperature 0.1

---

## 2. Pagina Completa de Edicao de Agentes

### 2.1 Nova rota

Adicionar em `App.tsx`:
- `/ai-lab/agents/new` — criar novo agente
- `/ai-lab/agents/:id/edit` — editar agente existente

### 2.2 Nova pagina `AgentEditor.tsx`

Pagina completa (nao modal) com breadcrumb `AI Lab > Agentes > [Nome]` e 4 secoes:

**Secao 1 — Identidade**
- Nome (text input)
- Slug (text input, auto-gerado a partir do nome, editavel)
- Descricao curta (text input, max 200 chars com contador)
- Icone (select com 12 opcoes: bot, calculator, shield-check, hard-hat, briefcase, scale, clipboard-check, users, brain, target, sword, flame)
- Cor (color picker)
- Ativo/Inativo (switch)

**Secao 2 — Personalidade e Comportamento**
- Label: "Instrucao Principal — Define quem o agente e, como se comporta, e o que ele sabe"
- Textarea grande (min 10 linhas, com contador de caracteres)
- Texto de ajuda abaixo

**Secao 3 — Parametros Tecnicos**
- Temperatura (slider 0.0-1.0, step 0.1)
  - Label "Criatividade"
  - Texto auxiliar sobre o range
- Max tokens (number input, 100-4000, default 2000)
  - Label "Tamanho maximo da resposta"

**Secao 4 — Preview**
- Campo de teste para digitar pergunta
- Botao "Testar Agente" que chama `/chat` com o system_prompt configurado
- Exibe resposta abaixo para validacao

Botoes "Salvar" e "Cancelar" fixos no bottom.

### 2.3 Atualizar `AILabAgents.tsx`

- Remover o `AgentCreateDialog` (modal)
- Botao "Novo Agente" navega para `/ai-lab/agents/new`
- Botao "Editar" no `AgentCard` navega para `/ai-lab/agents/:id/edit`

### 2.4 Atualizar `agent-icons.ts`

Adicionar 4 novos icones: `brain`, `target`, `sword` (Swords), `flame`

---

## 3. Envio Dinamico no Chat

### 3.1 Atualizar `useAIChat.ts`

No payload do `callAgent`, adicionar o campo `temperature`:

```text
body: {
  message,
  thread_id,
  user_id,
  agent_type,
  system_prompt,
  temperature,    // NOVO
  history
}
```

### 3.2 Atualizar `AgentMeta` interface

Adicionar `temperature` e `max_tokens` ao `AgentMeta`.

### 3.3 Atualizar `AILabChat.tsx`

Passar `temperature` e `max_tokens` no objeto agentMeta ao chamar `sendMessage` e `sendRound`.

### 3.4 Atualizar `useAIAgents.ts`

Adicionar `temperature` e `max_tokens` ao tipo `AIAgent`.

---

## 4. Detalhes tecnicos

### Arquivos criados

| Arquivo | Descricao |
|---|---|
| `src/pages/ai-lab/AgentEditor.tsx` | Pagina completa de edicao |

### Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| Migration SQL | Colunas `temperature`, `max_tokens`; update prompts dos 3 agentes |
| `src/App.tsx` | Rotas `/ai-lab/agents/new` e `/ai-lab/agents/:id/edit` |
| `src/lib/agent-icons.ts` | 4 novos icones (brain, target, swords, flame) |
| `src/hooks/ai-lab/useAIAgents.ts` | Campos `temperature`, `max_tokens` no tipo |
| `src/hooks/ai-lab/useAIChat.ts` | Enviar `temperature` no payload; atualizar `AgentMeta` |
| `src/pages/ai-lab/AILabAgents.tsx` | Navegacao para pagina de edicao em vez de modal |
| `src/pages/ai-lab/AILabChat.tsx` | Passar `temperature`/`max_tokens` no agentMeta |
| `src/components/ai-lab/AgentCard.tsx` | Link de edicao navega para rota |

### Fluxo do Preview/Teste

```text
Admin preenche system_prompt + temperature
  |
  v
Digita pergunta no campo de teste
  |
  v
Clica "Testar Agente"
  |
  v
Busca settings do usuario (api_url, api_key)
  |
  v
POST /chat { message, system_prompt, temperature, agent_type: slug }
  |
  v
Exibe resposta no card abaixo do botao
```

