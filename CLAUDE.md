# PowerConcept — Contexto para Claude Code

## Stack
- Frontend: React + TypeScript + Vite + shadcn/ui + Tailwind
- Backend: Supabase (shgnpbrfkqkcuyjddojp) — PostgreSQL + Auth + RLS
- ERP: Omie (financeiro, NFs)
- Deploy: Coolify no VPS 72.60.13.91 via push na main
- URL produção: app.powerconcept.com.br

## Regras de desenvolvimento
- Branches novas: sempre `claude/nome-da-feature`
- Código em PT-BR com JSDoc
- Cálculos em `src/calculations/`, regras em `src/rules/`, APIs em `src/services/`
- Formulários: react-hook-form + zod + sonner (toast)
- Tabela correta: `projetos` (não `projects`), `collaborators`
- Supabase ATIVO: shgnpbrfkqkcuyjddojp
- Supabase ABANDONADO (não usar): anjfgswaktmemysfmyff

## Fluxo padrão para toda feature
1. Cria branch `claude/nome-da-feature`
2. Implementa o código seguindo os padrões acima
3. Commit descritivo em PT-BR
4. Abre PR via MCP GitHub
5. Executa migration via MCP Supabase (se houver SQL novo)
6. Merga o PR
7. Envia notificação WhatsApp ao Conrado

## Serviços no VPS
- Frontend: Coolify (deploy automático via push na main)
- AI Backend: systemd `ia-backend` → ia.powerconcept.com.br:8000
- WhatsApp Bot: systemd `whatsapp-bot` → bot.powerconcept.com.br:8001
- Evolution API: Docker → evolution.powerconcept.com.br:8080

## Notificações
Ao finalizar uma implementação completa (após merge + migration), executar:
/root/notify.sh 'Feature X implementada e no ar em app.powerconcept.com.br'
