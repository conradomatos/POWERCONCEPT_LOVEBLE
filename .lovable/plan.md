

# Migrar URL do Backend e Remover Header ngrok

## Resumo

Remover o header `ngrok-skip-browser-warning` de 3 arquivos e atualizar a URL padrao do backend na tabela `ai_settings` para `https://ia.powerconcept.com.br`.

---

## Alteracoes

### 1. Remover header ngrok de `src/hooks/ai-lab/useAIChat.ts`

Remover a linha `'ngrok-skip-browser-warning': 'true'` do objeto `headers` na funcao `callAgent`.

### 2. Remover header ngrok de `src/hooks/ai-lab/useAISettings.ts`

Remover o header da chamada `fetch` ao endpoint `/health` na funcao `testConnection`.

### 3. Remover header ngrok de `src/pages/ai-lab/AgentEditor.tsx`

Remover a linha do objeto `headers` na funcao de teste do agente.

### 4. Atualizar URL no banco de dados

Executar migracao SQL para atualizar todos os registros existentes em `ai_settings` que contenham URLs ngrok (ou qualquer URL) para a nova URL definitiva:

```text
UPDATE ai_settings
SET api_url = 'https://ia.powerconcept.com.br'
WHERE api_url IS NOT NULL;
```

---

## Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/hooks/ai-lab/useAIChat.ts` | Remover header ngrok |
| `src/hooks/ai-lab/useAISettings.ts` | Remover header ngrok |
| `src/pages/ai-lab/AgentEditor.tsx` | Remover header ngrok |
| Migration SQL | Atualizar api_url existentes no banco |

