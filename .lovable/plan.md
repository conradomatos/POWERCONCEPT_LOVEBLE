

# Fase 2 — Multi-Agente na Mesma Thread

## Resumo

Permitir que o usuario convoque multiplos agentes numa mesma conversa. Cada agente le o historico completo (incluindo respostas de outros agentes) e responde com sua perspectiva. Inclui modo "Rodada Completa" onde todos os agentes convocados respondem em sequencia.

---

## 1. Modelo de Dados

### 1.1 Nova coluna em `ai_threads`

Adicionar campo para rastrear quais agentes estao ativos na thread:

```text
active_agents text[] DEFAULT '{default}'
```

Isso permite persistir a selecao de agentes entre sessoes.

### 1.2 Sem novas tabelas

Nenhuma tabela adicional necessaria. As mensagens ja possuem `agent_id`, `agent_name`, `agent_color` da Fase 1.

---

## 2. Mudancas na UI do Chat (`AILabChat.tsx`)

### 2.1 Seletor multi-agente

- Trocar selecao unica por selecao multipla (array de slugs)
- Chips agora funcionam como toggles: clicar ativa/desativa o agente
- Minimo 1 agente sempre ativo
- Agentes ativos tem fundo colorido; inativos tem borda

### 2.2 Modos de envio

Dois botoes no input area:

- **Enviar** (icone Send): envia para o primeiro agente selecionado (comportamento atual)
- **Todos Respondem** (icone Users): dispara rodada completa com todos os agentes ativos

### 2.3 Loading state por agente

- Quando em rodada completa, exibir indicador de "pensando" com nome e cor do agente que esta respondendo no momento
- Banner atualiza conforme cada agente responde

---

## 3. Logica de Rodada Completa (`useAIChat.ts`)

### 3.1 Nova funcao `sendRound`

```text
sendRound(content, agents[]) =>
  1. Salva mensagem do usuario
  2. Para cada agente em sequencia:
     a. Busca historico atualizado (inclui respostas anteriores da rodada)
     b. Chama POST /chat com agent_type e system_prompt do agente
     c. Salva resposta com agent_id/name/color
     d. Adiciona ao state de mensagens
     e. Atualiza status banner com nome do proximo agente
  3. Atualiza thread
```

### 3.2 Historico enriquecido

No payload `history`, incluir `agent_name` junto com `role` e `content` para que cada agente saiba quem disse o que:

```text
history: [
  { role: "user", content: "..." },
  { role: "assistant", content: "...", agent_name: "Engenheiro de Custos" },
  { role: "assistant", content: "...", agent_name: "Auditor Fiscal" },
]
```

### 3.3 System prompt de reuniao

Quando ha multiplos agentes ativos, adicionar prefixo ao system_prompt:

```text
"Voce esta numa reuniao virtual com outros especialistas. 
Considere as respostas anteriores dos colegas antes de dar sua opiniao. 
Se concordar, complemente. Se discordar, explique por que."
```

---

## 4. Mudancas no `ChatInput.tsx`

- Receber prop `showRoundButton: boolean` (true quando mais de 1 agente ativo)
- Adicionar botao "Todos Respondem" ao lado do botao de enviar
- Callback `onSendRound` separado do `onSend`

---

## 5. Persistencia de agentes ativos na thread

### 5.1 Hook `useAIThreads`

- Ao ativar/desativar agentes no chat, salvar array `active_agents` na thread via update
- Ao abrir uma thread existente, restaurar selecao de agentes a partir desse campo

---

## 6. Detalhes tecnicos

### Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Adicionar `active_agents text[]` em `ai_threads` |
| `src/hooks/ai-lab/useAIChat.ts` | Adicionar funcao `sendRound`, enriquecer historico com `agent_name` |
| `src/pages/ai-lab/AILabChat.tsx` | Multi-selecao de agentes, botao "Todos Respondem", loading por agente |
| `src/components/ai-lab/ChatInput.tsx` | Novo botao de rodada completa |
| `src/components/ai-lab/AgentStatusBanner.tsx` | Exibir nome/cor do agente respondendo |

### Fluxo do modo "Todos Respondem"

```text
Usuario clica "Todos Respondem"
  |
  v
Salva mensagem do usuario no Supabase
  |
  v
Loop sequencial pelos agentes ativos:
  |
  +---> Busca historico atualizado (com respostas ja dadas nesta rodada)
  +---> POST /chat { message, agent_type, system_prompt (com prefixo reuniao), history }
  +---> Salva resposta do agente com metadados (agent_id, name, color)
  +---> Atualiza UI com nova mensagem
  +---> Atualiza banner: "Agente X respondeu. Agente Y pensando..."
  |
  v
Todos responderam → limpa status, atualiza thread
```

### Consideracoes

- Chamadas ao backend sao **sequenciais** (nao paralelas) para que cada agente veja as respostas anteriores
- Se um agente falhar, os demais continuam (erro salvo como mensagem do agente que falhou)
- Timeout de 120s por agente mantido
- Header `ngrok-skip-browser-warning: true` mantido em todas as chamadas

