
## Plano de Revisão do Módulo Orçamentos

### ✅ Fase 1: Correções de Segurança (CONCLUÍDO)
1. ~~Revisar Views SECURITY DEFINER~~ → Convertidas para SECURITY INVOKER
2. ~~Ajustar RLS Policies permissivas~~ → Restringidas para admins/catalog_managers
3. ~~Corrigir funções sem search_path~~ → Adicionado SET search_path = 'public'

**Resultado:** De 53 issues → 7 warnings (6 intencionais para dados de revisão)

### ✅ Fase 2: Rotas Faltantes (CONCLUÍDO)
1. ~~Criar página Impostos~~ → `/orcamentos/bases/impostos` com CatalogoImpostos.tsx
2. ~~Criar página Markup~~ → `/orcamentos/bases/markup` com CatalogoMarkup.tsx

**Hooks criados:** useTaxRulesCatalog.ts, useMarkupRulesCatalog.ts

### ✅ Fase 3: Correções de Cálculo (PARCIAL)
1. ~~Incluir budget_labor_items no Budget Summary~~ → Agora soma labor_items OU allocations
2. **TODO:** Adicionar incidências MO ao total (requer tabela específica por revisão)
3. **TODO:** Implementar cashflow automático proporcional ao histograma

### Fase 4: Refatorações de Código (Backlog)
1. Consolidar hooks duplicados (useLaborRoleCatalog + useBudgetLaborCatalog)
2. Padronizar confirmações de exclusão com AlertDialog do Radix
3. Corrigir ícone de Equipamentos na sidebar

### Fase 5: Funcionalidades Pendentes (Backlog)
1. Verificar/completar Histograma.tsx
2. Verificar/completar Cronograma.tsx
3. Conectar geração de PDF da proposta
4. Adicionar exportação Excel nos grids
