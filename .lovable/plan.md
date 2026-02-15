

# Sistema de Agentes no AI Lab -- Fase 1

## Resumo

Reestruturar a tabela `ai_agents` para ser compartilhada (nao mais por usuario), adicionar campos de identidade visual nas mensagens, criar seletor de agente no chat e melhorar a tela de gestao de agentes.

---

## 1. Migracao de Banco de Dados

### 1.1 Reestruturar `ai_agents`

A tabela atual tem `user_id` e uma RLS por usuario. O requisito pede agentes compartilhados com leitura para todos autenticados e escrita apenas para admins.

```sql
-- Remover coluna user_id e RLS antiga
ALTER TABLE ai_agents DROP COLUMN user_id;
DROP POLICY IF EXISTS "Users manage own agents" ON ai_agents;

-- Adicionar novas colunas
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(user_id);
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Renomear colunas para alinhar com o spec
ALTER TABLE ai_agents RENAME COLUMN avatar_icon TO icon;
ALTER TABLE ai_agents RENAME COLUMN avatar_color TO color;

-- Novas RLS
CREATE POLICY "Authenticated read active agents"
  ON ai_agents FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage agents"
  ON ai_agents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));
```

### 1.2 Dados seed (3 agentes padrao)

Inserir os 3 agentes diretamente na migracao, substituindo os antigos (que eram por usuario):

```sql
DELETE FROM ai_agents; -- limpar dados antigos per-user

INSERT INTO ai_agents (name, slug, icon, color, description, system_prompt) VALUES
('Assistente Geral', 'default', 'bot', '#F59E0B',
 'Assistente especializado em gestao de projetos de construcao civil',
 'Voce e um assistente especializado em gestao de projetos de construcao civil. Responda sempre em portugues brasileiro. Seja direto e pratico.'),
('Engenheiro de Custos', 'engineer', 'calculator', '#3B82F6',
 'Especialista em orcamentacao, SINAPI, SICRO e composicoes de custo',
 'Voce e um Engenheiro de Custos senior especializado em orcamentacao de obras. Responda em portugues brasileiro. Seja tecnico e preciso.'),
('Auditor Fiscal', 'auditor', 'shield-check', '#EF4444',
 'Especialista em conformidade, normas e fiscalizacao de obras',
 'Voce e um Auditor Fiscal especializado em obras publicas e privadas. Responda em portugues brasileiro. Seja rigoroso e detalhista.');
```

### 1.3 Adicionar campos de identidade nas mensagens

```sql
ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES ai_agents(id),
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS agent_color text;
```

---

## 2. Alteracoes no Hook `useAIAgents`

**Arquivo:** `src/hooks/ai-lab/useAIAgents.ts`

- Remover toda logica de `user_id` (filtro e insert)
- Remover seed automatico (agentes agora vem da migracao)
- Atualizar interface `AIAgent` para usar `icon` e `color` em vez de `avatar_icon` e `avatar_color`, e adicionar `system_prompt`, `created_by`, `updated_at`
- `fetchAgents`: buscar todos sem filtro de user_id, ordenar por created_at
- `createAgent`: inserir com `created_by: user.id`
- Verificacao de admin para operacoes de escrita fica na UI (RLS protege no banco)

---

## 3. Tela de Gestao de Agentes

**Arquivos:** `src/pages/ai-lab/AILabAgents.tsx`, `src/components/ai-lab/AgentCard.tsx`, `src/components/ai-lab/AgentCreateDialog.tsx`

### AgentCard
- Atualizar refs de `avatar_icon`/`avatar_color` para `icon`/`color`
- Expandir `iconMap` com os novos icones: `bot`, `calculator`, `shield-check`, `hard-hat`, `briefcase`, `scale`, `clipboard-check`, `users` (usando nomes kebab-case do Lucide mapeados para componentes)
- Botoes de editar/excluir/toggle so aparecem se usuario `hasRole('admin')` ou `isSuperAdmin()`

### AgentCreateDialog
- Adicionar campo `system_prompt` (textarea grande)
- Campo de icone como `<Select>` com as 8 opcoes pre-definidas
- Atualizar refs de campo para `icon`/`color`
- Incluir `system_prompt` no submit

### AILabAgents
- Botao "Novo Agente" visivel apenas para admins
- Usar `useAuth().hasRole` para controlar visibilidade

---

## 4. Seletor de Agente no Chat

**Arquivo:** `src/pages/ai-lab/AILabChat.tsx`

- Importar `useAIAgents` para buscar agentes ativos
- Adicionar estado `selectedAgentSlug` (default: `'default'`)
- Renderizar barra de chips horizontal entre o header e as mensagens
- Cada chip mostra icone Lucide + nome do agente
- Chip selecionado: `background-color` = cor do agente, texto branco
- Chip nao selecionado: borda na cor do agente, texto na cor, fundo transparente
- Ao enviar mensagem, usar `selectedAgentSlug` no campo `agent_type`

---

## 5. Payload do Chat com system_prompt

**Arquivo:** `src/hooks/ai-lab/useAIChat.ts`

- Receber `agentId`, `agentName`, `agentColor` e `systemPrompt` como parametros opcionais em `sendMessage`
- Incluir `system_prompt` no payload JSON enviado ao `/chat`
- Ao salvar mensagem do assistant, incluir `agent_id`, `agent_name`, `agent_color`
- Atualizar interface `AIMessage` com os 3 novos campos opcionais

---

## 6. Identidade Visual nas Mensagens

**Arquivo:** `src/components/ai-lab/ChatMessage.tsx`

- Se `message.agent_name` e `message.agent_color` existirem, exibir badge acima do conteudo: circulo colorido + nome do agente em texto pequeno
- Se nao existirem, exibir "Assistente"
- Icone do avatar do assistant usa a cor do agente (se disponivel) em vez de cinza padrao

---

## Detalhes tecnicos

### Mapeamento de icones (AgentCard e Chat)

```typescript
import {
  Bot, Calculator, ShieldCheck, HardHat,
  Briefcase, Scale, ClipboardCheck, Users
} from 'lucide-react';

const AGENT_ICONS: Record<string, React.ComponentType<{className?: string}>> = {
  'bot': Bot,
  'calculator': Calculator,
  'shield-check': ShieldCheck,
  'hard-hat': HardHat,
  'briefcase': Briefcase,
  'scale': Scale,
  'clipboard-check': ClipboardCheck,
  'users': Users,
};
```

### Fluxo de envio de mensagem atualizado

1. Usuario seleciona agente no seletor (estado local)
2. Ao clicar enviar, `AILabChat` chama `sendMessage(content, agent.slug, agent.id, agent.name, agent.color, agent.system_prompt)`
3. `useAIChat.sendMessage` inclui `system_prompt` no payload e salva metadados do agente na mensagem assistant

### Arquivos criados/modificados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar (reestruturar ai_agents, seed, ai_messages cols) |
| `src/hooks/ai-lab/useAIAgents.ts` | Modificar (remover user_id, atualizar campos) |
| `src/hooks/ai-lab/useAIChat.ts` | Modificar (novos params, payload, salvar agent info) |
| `src/pages/ai-lab/AILabAgents.tsx` | Modificar (admin check) |
| `src/pages/ai-lab/AILabChat.tsx` | Modificar (seletor de agente) |
| `src/components/ai-lab/AgentCard.tsx` | Modificar (icones, admin check) |
| `src/components/ai-lab/AgentCreateDialog.tsx` | Modificar (system_prompt, select icone) |
| `src/components/ai-lab/ChatMessage.tsx` | Modificar (badge do agente) |

