

# Adicionar API Token com valor padrao no AI Lab

## Resumo

O campo `api_key` ja existe na tabela `ai_settings` e o codigo ja envia `Authorization: Bearer {api_key}` nas chamadas `/chat` (e NAO no `/health`). As alteracoes sao cosmeticas e de dados.

## Alteracoes

### 1. Atualizar UI em `src/pages/ai-lab/AILabSettings.tsx`

- Renomear o label de "Chave de API (opcional)" para "API Token"
- Adicionar estado `showToken` para controlar visibilidade
- Trocar `type="password"` por dinamico (`password` / `text`)
- Adicionar botao com icone Eye/EyeOff para alternar visibilidade
- Atualizar placeholder para `pc-ia-...`

### 2. Atualizar valor padrao no banco de dados (Migration SQL)

```text
-- Setar token padrao para registros existentes sem token
UPDATE ai_settings
SET api_key = 'pc-ia-2026-SkR8mX4vQzL7nW3j'
WHERE api_key IS NULL;

-- Alterar default da coluna para novos registros
ALTER TABLE ai_settings
ALTER COLUMN api_key SET DEFAULT 'pc-ia-2026-SkR8mX4vQzL7nW3j';
```

### 3. Verificacao -- nenhuma alteracao necessaria

Os 3 arquivos que fazem fetch ja implementam o Bearer token corretamente:

| Arquivo | Endpoint | Token | Status |
|---|---|---|---|
| `useAIChat.ts` | `/chat` | Sim (Bearer) | OK |
| `AgentEditor.tsx` | `/chat` | Sim (Bearer) | OK |
| `useAISettings.ts` | `/health` | Nao | OK (conforme requisito) |

## Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/pages/ai-lab/AILabSettings.tsx` | Renomear label, adicionar toggle show/hide |
| Migration SQL | Setar default e atualizar registros existentes |

