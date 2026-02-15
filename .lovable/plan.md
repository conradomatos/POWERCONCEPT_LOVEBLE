

# Adicionar header ngrok-skip-browser-warning nos fetches do AI Lab

## Alteracoes

### 1. `src/hooks/ai-lab/useAIChat.ts`
Na funcao `sendMessage`, no fetch para `${settings.api_url}/chat` (linha ~68), adicionar `'ngrok-skip-browser-warning': 'true'` ao objeto `headers`.

### 2. `src/hooks/ai-lab/useAISettings.ts`
Na funcao `testConnection`, no fetch para `${url}/health` (linha ~62), adicionar `'ngrok-skip-browser-warning': 'true'` aos headers do request.

## Detalhes tecnicos

Ambos os arquivos ja constroem um objeto `headers` antes do fetch. Basta incluir a chave extra em cada um:

**useAIChat.ts** — bloco do fetch (~linha 68):
```typescript
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};
```

**useAISettings.ts** — fetch do /health (~linha 62):
```typescript
const response = await fetch(`${url}/health`, {
  method: 'GET',
  headers: { 'ngrok-skip-browser-warning': 'true' },
  signal: AbortSignal.timeout(5000),
});
```

Nenhuma outra alteracao necessaria.

