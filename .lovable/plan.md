

# Correcao do Historico no useAIChat

## Problema

A funcao `fetchHistory` (linhas 61-75) ja busca todas as mensagens da thread (user + assistant) com limit 20 e inclui `agent_name`. Porem, o campo `agent_name` e enviado como campo separado no objeto, e nao prefixado no `content`. Isso faz com que o backend (LLM) nao consiga distinguir qual agente disse o que, pois recebe apenas `role: "assistant"` sem identificacao no conteudo.

## Solucao

Alterar a funcao `fetchHistory` para prefixar o conteudo das mensagens assistant com `[agent_name]:` quando disponivel, e remover o campo `agent_name` separado do objeto retornado (simplificando o payload).

## Alteracao unica

**Arquivo:** `src/hooks/ai-lab/useAIChat.ts`

**Trecho afetado:** funcao `fetchHistory` (linhas 61-75)

Substituir o mapeamento atual:

```typescript
return (historyData || []).map(m => ({
  role: m.role,
  content: m.content,
  ...(m.agent_name ? { agent_name: m.agent_name } : {}),
}));
```

Por:

```typescript
return (historyData || []).map(m => ({
  role: m.role,
  content: m.role === 'assistant' && m.agent_name
    ? `[${m.agent_name}]: ${m.content}`
    : m.content,
}));
```

Isso garante que:
- Mensagens do usuario continuam como `{ role: "user", content: "texto" }`
- Mensagens de assistentes com `agent_name` sao enviadas como `{ role: "assistant", content: "[Engenheiro de Custos]: texto..." }`
- Mensagens sem `agent_name` (antigas) permanecem sem prefixo
- O campo `agent_name` separado e removido do payload (desnecessario, pois a informacao agora esta no content)
- Nenhuma outra alteracao necessaria: a busca ja inclui todas as mensagens da thread, o header `ngrok-skip-browser-warning` ja esta presente, e o limit de 20 ja esta configurado

