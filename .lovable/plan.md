
## Plano de Revisão do Módulo Orçamentos

### Fase 1: Correções de Segurança (Alta Prioridade)
1. **Revisar Views SECURITY DEFINER**
   - Identificar as 7 views problemáticas
   - Converter para SECURITY INVOKER ou adicionar verificações de role
   - Views afetadas: vw_budget_equipment, vw_budget_labor_items, vw_budget_labor_roles, etc.

2. **Ajustar RLS Policies permissivas**
   - Mapear as ~40 policies com `USING (true)` ou `WITH CHECK (true)`
   - Implementar verificações baseadas em `auth.uid()` e roles
   - Priorizar tabelas de orçamentos e dados financeiros

3. **Corrigir funções sem search_path**
   - Adicionar `SET search_path = 'public'` nas funções identificadas

### Fase 2: Rotas Faltantes (Média Prioridade)
1. **Criar página Indiretos** (`/orcamentos/bases/indiretos`)
   - Consolidar: Mobilização, Canteiro, Alimentação Industrial
   - Usar dados das tabelas: mobilization_catalog, site_maintenance_catalog

2. **Criar página Impostos** (`/orcamentos/bases/impostos`)
   - Catálogo global de regras de impostos (tax_rules_catalog)
   - CRUD com validação

3. **Criar página Markup** (`/orcamentos/bases/markup`)
   - Catálogo global de templates de markup (markup_rules_catalog)
   - Permitir criação de conjuntos padrão

### Fase 3: Correções de Cálculo (Média Prioridade)
1. **Incluir Incidências MO no Budget Summary**
   - Modificar `useBudgetSummary.ts` para buscar incidências por role
   - Calcular custo total de incidências baseado nos roles do orçamento
   - Somar ao `total_mo` ou criar linha separada

2. **Verificar fluxo de cálculo Labor**
   - Auditar caminho: labor_roles -> labor_cost_snapshot -> labor_hh_allocations
   - Garantir que alterações em salários/encargos recalculam snapshots

3. **Implementar cashflow automático**
   - Distribuir custos proporcionalmente ao histograma de HH
   - Gerar projeção mensal para cronograma financeiro

### Fase 4: Refatorações de Código (Baixa Prioridade)
1. **Consolidar hooks duplicados**
   - Unificar useLaborRoleCatalog + useBudgetLaborCatalog
   - Renomear para clareza: useLaborRoleCatalog (global) vs useBudgetLaborRoles (revision)

2. **Padronizar confirmações de exclusão**
   - Substituir `confirm()` por AlertDialog do Radix
   - Aplicar em: Estrutura.tsx, Materiais.tsx, MaoDeObra.tsx

3. **Corrigir ícones da sidebar**
   - Equipamentos: mudar de PencilRuler para Cog ou outro ícone distintivo

### Fase 5: Funcionalidades Pendentes (Backlog)
1. **Verificar/completar Histograma.tsx**
2. **Verificar/completar Cronograma.tsx**
3. **Implementar geração de PDF** (edge function existe mas botão não conectado)
4. **Adicionar exportação Excel** nos grids principais
