

# Enviar historico de mensagens no payload do chat

## Alteracao

No `src/hooks/ai-lab/useAIChat.ts`, na funcao `sendMessage`, antes de fazer o POST para `${settings.api_url}/chat`, buscar as ultimas 20 mensagens da thread no Supabase e incluir como campo `history` no body.

## Detalhes tecnicos

Na funcao `sendMessage` (linha ~45), apos salvar a mensagem do usuario no Supabase e antes do fetch para a API externa (~linha 73):

1. Buscar historico da thread:
```typescript
const { data: historyData } = await supabase
  .from('ai_messages')
  .select('role, content')
  .eq('thread_id', threadId)
  .in('role', ['user', 'assistant'])
  .order('created_at', { ascending: true })
  .limit(20);
```

Nota: esta query retorna as mensagens ja existentes no banco, incluindo a mensagem do usuario que acabou de ser inserida. Para excluir a mensagem atual do historico, filtrar pelo id da mensagem recem-inserida:
```typescript
const history = (historyData || [])
  .filter(m => m.id !== userMsg.id)
  .map(m => ({ role: m.role, content: m.content }));
```

Ajuste: a query de select precisa incluir `id` alem de `role` e `content` para permitir o filtro. Alternativamente, buscar o historico ANTES de inserir a mensagem do usuario -- esta abordagem e mais simples e garante que a mensagem atual nao aparece.

**Abordagem escolhida:** mover a busca do historico para ANTES do insert da mensagem do usuario. Assim nao precisa filtrar nada.

2. Incluir no body do fetch:
```typescript
body: JSON.stringify({
  message: content,
  thread_id: threadId,
  user_id: user.id,
  agent_type: agentType || 'default',
  history: history,
}),
```

## Arquivo modificado
- `src/hooks/ai-lab/useAIChat.ts`

## Nenhuma outra alteracao
- Headers com `ngrok-skip-browser-warning` permanecem inalterados
- Toda a logica restante (salvar resposta, atualizar thread, tratamento de erro) permanece igual

