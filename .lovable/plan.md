

# AI Lab -- Central de Inteligencia Artificial

## Resumo

Novo modulo completo com 5 tabelas no banco, 8 rotas, layout com sidebar interna, interface de chat com Markdown rendering, e integracao com API externa configuravel. Segue os mesmos padroes visuais e de navegacao do PowerConcept.

## Escopo da Implementacao

### Fase 1: Infraestrutura (banco + navegacao)
### Fase 2: Paginas funcionais (Dashboard, Chat, Settings, Agents, Templates)
### Fase 3: Placeholders (Artifacts, Analytics, Logs)

---

## 1. Migration SQL -- 5 tabelas com RLS

Criar tabelas `ai_threads`, `ai_messages`, `ai_agents`, `ai_prompt_templates` e `ai_settings`.

**Correcao importante vs. especificacao:** A tabela `projetos` (nao `projects`) sera referenciada. O campo `project_id` em `ai_threads` fara `REFERENCES projetos(id)`.

```text
-- ai_threads
CREATE TABLE ai_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  thread_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  agent_type TEXT DEFAULT 'default',
  project_id UUID REFERENCES projetos(id),
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: users manage own threads (auth.uid() = user_id)

-- ai_messages
CREATE TABLE ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES ai_threads(thread_id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- user, assistant, system
  content TEXT NOT NULL,
  agent_type TEXT,
  metadata JSONB DEFAULT '{}',
  is_favorited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: users access messages in their threads via subquery

-- ai_agents (per-user agent definitions)
-- ai_prompt_templates (per-user prompt library)
-- ai_settings (per-user API config, one row per user)
```

Todas com RLS usando `auth.uid() = user_id`. Para `ai_messages`, policy via subquery em `ai_threads`.

Trigger `update_updated_at_column` reutilizado para `ai_threads` e `ai_settings`.

Validation trigger para `ai_threads.status` em vez de CHECK constraint (seguindo padrao do projeto).

---

## 2. Navegacao -- Nova area "AI Lab"

### 2A. Layout.tsx

- Adicionar `'ailab'` ao tipo `NavigationArea`
- Adicionar rota `/ai-lab` ao `routeToArea`
- Adicionar item no `topNavAreas`: icone `Brain`, label "AI Lab"
- Adicionar rota padrao: `ailab: '/ai-lab'`

### 2B. AppSidebar.tsx

Adicionar area `ailab` em `areaNavItems` com items:
- Projetos IA (`/ai-lab`, icone MessageSquare)
- Agentes (`/ai-lab/agents`, icone Bot)
- Templates (`/ai-lab/templates`, icone FileText)
- Artefatos (`/ai-lab/artifacts`, icone Archive)
- Analytics (`/ai-lab/analytics`, icone BarChart3)
- Logs (`/ai-lab/logs`, icone ScrollText)
- Configuracoes (`/ai-lab/settings`, icone Settings)

### 2C. App.tsx

Adicionar rotas:
```text
/ai-lab              -> AILabDashboard
/ai-lab/chat/:threadId -> AILabChat
/ai-lab/agents       -> AILabAgents
/ai-lab/templates    -> AILabTemplates
/ai-lab/artifacts    -> AILabPlaceholder (Artefatos)
/ai-lab/analytics    -> AILabPlaceholder (Analytics)
/ai-lab/logs         -> AILabPlaceholder (Logs)
/ai-lab/settings     -> AILabSettings
```

---

## 3. Dependencias

Instalar `react-markdown` e `remark-gfm` para renderizacao de Markdown no chat.

Nao instalar `react-syntax-highlighter` -- usar blocos `<pre><code>` estilizados com Tailwind para manter o bundle leve. Se necessario no futuro, pode ser adicionado.

---

## 4. Hooks React (5 hooks)

### 4A. `src/hooks/ai-lab/useAISettings.ts`
- Buscar/salvar configuracoes de `ai_settings`
- `testConnection(url)`: GET `${url}/health` com timeout 5s
- Cache da URL da API

### 4B. `src/hooks/ai-lab/useAIThreads.ts`
- CRUD em `ai_threads`
- Listagem com filtros (status, agent_type)
- Contadores para dashboard (total threads, total messages, agents ativos)

### 4C. `src/hooks/ai-lab/useAIChat.ts`
- `sendMessage`: salva msg user -> POST API -> salva msg assistant -> atualiza thread
- `loadHistory`: busca de `ai_messages`
- Estado de loading/status do agente
- Retry em caso de falha

### 4D. `src/hooks/ai-lab/useAIAgents.ts`
- CRUD em `ai_agents`
- Seed automatico na primeira visita (3 agentes padrao)

### 4E. `src/hooks/ai-lab/useAITemplates.ts`
- CRUD em `ai_prompt_templates`
- Incrementar `usage_count`
- Filtrar por categoria
- Seed automatico (5 templates exemplo)

---

## 5. Componentes (15 componentes)

```text
src/components/ai-lab/
  ChatInterface.tsx        -- Tela completa do chat (header + messages + input)
  ChatMessage.tsx           -- Mensagem individual (user vs assistant, markdown)
  ChatInput.tsx             -- Textarea expansivel + botoes
  AgentStatusBanner.tsx     -- "Engenheiro esta pensando..." com animacao
  MarkdownRenderer.tsx      -- Wrapper de react-markdown + remark-gfm
  ThreadCard.tsx            -- Card de thread na listagem
  ThreadCreateDialog.tsx    -- Dialog nova thread
  AgentCard.tsx             -- Card de agente
  AgentCreateDialog.tsx     -- Dialog criar/editar agente
  TemplateCard.tsx          -- Card de template
  TemplateCreateDialog.tsx  -- Dialog criar/editar template
  ConnectionTester.tsx      -- Componente de teste de conexao
  PlaceholderPage.tsx       -- Pagina generica "Em breve"
  StatCard.tsx              -- Card de estatistica para dashboard
```

---

## 6. Paginas

### 6A. AILabDashboard (`/ai-lab`)
- 4 StatCards no topo: Threads Ativas, Total Msgs, Agentes Ativos, Status API
- Campo de busca + filtros (status, agente)
- Listagem de ThreadCards
- Botao "Nova Thread" abre ThreadCreateDialog
- ThreadCreateDialog: titulo, descricao, agente (select), projeto vinculado (select de projetos)

### 6B. AILabChat (`/ai-lab/chat/:threadId`)
- Header: titulo da thread (editavel), badge do agente, link para projeto
- Area de mensagens com scroll automatico
- ChatMessage com MarkdownRenderer (tabelas, codigo, listas)
- AgentStatusBanner animado durante loading
- ChatInput: textarea expansivel, Enter envia, Shift+Enter nova linha
- Acoes por mensagem (hover): copiar, favoritar

### 6C. AILabAgents (`/ai-lab/agents`)
- Listagem em cards com toggle ativo/inativo
- Dialog criar/editar (nome, slug, descricao, icone, cor)
- Seed automatico com 3 agentes padrao

### 6D. AILabTemplates (`/ai-lab/templates`)
- Listagem em cards com busca e filtro por categoria
- Dialog criar/editar (titulo, conteudo, categoria, agente)
- Favoritar e contador de uso
- Seed automatico com 5 templates

### 6E. AILabSettings (`/ai-lab/settings`)
- Input URL da API + Chave API (password)
- Select agente padrao
- Botao "Testar Conexao" com feedback visual (verde/vermelho + latencia)
- Status e ultima verificacao

### 6F. Placeholders (Artifacts, Analytics, Logs)
- Componente PlaceholderPage reutilizavel com icone, titulo, subtitulo, badge "Em desenvolvimento"

---

## 7. Fluxo do Chat (logica de API)

```text
1. Usuario digita mensagem e clica Enviar
2. Salva mensagem (role: 'user') em ai_messages
3. Mostra AgentStatusBanner ("pensando...")
4. Busca URL da API de ai_settings
5. POST para ${apiUrl}/chat com { message, thread_id, user_id, agent_type }
6. Recebe resposta { response, agent_status, metadata }
7. Salva mensagem (role: 'assistant') em ai_messages
8. Atualiza ai_threads (last_message_at, message_count++)
9. Esconde AgentStatusBanner
10. Se falhar: mostra toast de erro, permite retry
```

---

## 8. Seed de dados (via hooks, nao migration)

Os agentes e templates padrao serao criados na primeira visita do usuario ao modulo, via logica nos hooks `useAIAgents` e `useAITemplates`. Isso garante que cada usuario tenha seus proprios dados iniciais vinculados ao seu `user_id`.

**3 Agentes padrao:**
1. Padrao (slug: "default", icone: Bot, cor: #3b82f6)
2. Engenheiro de Custos (slug: "engineer", icone: HardHat, cor: #f59e0b)
3. Auditor Fiscal (slug: "auditor", icone: Shield, cor: #ef4444)

**5 Templates exemplo:**
1. "Analise a composicao de custos do item {item}" (Custos)
2. "Gere um relatorio de avanco fisico do projeto" (Relatorios)
3. "Audite as notas fiscais do mes {mes}" (Auditoria)
4. "Compare orcado vs realizado e identifique desvios" (Custos)
5. "Crie o cronograma macro para {escopo}" (Cronograma)

---

## 9. Arquivos criados/modificados

### Modificados:
- `src/components/Layout.tsx` -- adicionar area ailab
- `src/components/AppSidebar.tsx` -- adicionar items ailab
- `src/App.tsx` -- adicionar rotas /ai-lab/*

### Criados:
- `supabase/migrations/...` -- 5 tabelas + RLS + triggers
- `src/hooks/ai-lab/useAISettings.ts`
- `src/hooks/ai-lab/useAIThreads.ts`
- `src/hooks/ai-lab/useAIChat.ts`
- `src/hooks/ai-lab/useAIAgents.ts`
- `src/hooks/ai-lab/useAITemplates.ts`
- `src/components/ai-lab/*.tsx` (14 componentes)
- `src/pages/ai-lab/AILabDashboard.tsx`
- `src/pages/ai-lab/AILabChat.tsx`
- `src/pages/ai-lab/AILabAgents.tsx`
- `src/pages/ai-lab/AILabTemplates.tsx`
- `src/pages/ai-lab/AILabSettings.tsx`
- `src/pages/ai-lab/AILabPlaceholder.tsx`

### NAO muda:
- Nenhuma pagina existente
- Nenhum hook existente
- Nenhuma edge function
- Nenhum componente UI base
- Estrutura da DRE, financeiro, orcamentos

