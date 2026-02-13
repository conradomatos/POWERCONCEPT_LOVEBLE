

# FASE 7 -- DRE com Dados Reais do Omie

## Visao Geral

Conectar a DRE existente aos dados financeiros reais sincronizados do Omie, migrando categorias do localStorage para o banco de dados e criando o pipeline de mapeamento Omie -> contas DRE.

---

## Etapas de Implementacao

### ETAPA 1: Migration SQL

Criar uma unica migration com:

1. **Tabela `categorias_contabeis`** -- substitui localStorage
   - Campos: id, grupo_nome, grupo_tipo, grupo_ordem, nome (UNIQUE), conta_dre, tipo_gasto, keywords (TEXT[]), observacoes, ativa, ordem, created_at, updated_at
   - RLS: leitura para autenticados, escrita para admin/financeiro/super_admin

2. **Tabela `omie_categoria_mapeamento`** -- liga codigos Omie a contas DRE
   - Campos: id, codigo_omie (UNIQUE), descricao_omie, categoria_contabil_id (FK), conta_dre_override, ativo, created_at, updated_at
   - RLS: mesma politica

3. **ALTER TABLE** nas tabelas existentes (apenas ADD COLUMN):
   - `omie_contas_receber`: valor_inss, valor_ir, valor_iss, valor_pis, valor_cofins, valor_csll, categorias_rateio (JSONB), codigo_tipo_documento, id_conta_corrente, raw_data (JSONB)
   - `omie_contas_pagar`: mesmas colunas

4. **Indices** para performance (conta_dre, ativa, codigo_omie, nome)

---

### ETAPA 2: Hook de Categorias (Supabase)

**Novo arquivo: `src/hooks/useCategorias.ts`**

- `useCategorias()` -- query de todas categorias ativas, ordenadas por grupo_ordem + ordem
- `useCreateCategoria()` -- mutation insert
- `useUpdateCategoria()` -- mutation update
- `useDeleteCategoria()` -- mutation delete
- `useMigrarCategorias()` -- mutation que le localStorage e faz bulk insert no Supabase
- `useCheckMigration()` -- query que verifica se Supabase tem categorias (count > 0)

Todas com invalidation de cache via queryClient.

---

### ETAPA 3: Atualizar FinanceiroCategorias.tsx

**Mudancas no arquivo existente (764 linhas):**

- Substituir `useState<CategoriasStorage>(() => loadCategoriasStorage())` por `useCategorias()` do hook
- Substituir todas chamadas `persist()` / `saveCategoriasStorage()` por mutations Supabase
- Adicionar botao "Migrar para nuvem" no header quando detectar dados no localStorage e Supabase vazio
- Manter mesma UI (accordions, CRUD de grupos/categorias, import/export Excel)
- Import Excel: converter para insert no Supabase (em vez de localStorage)
- Export Excel: continua funcionando (le dados do hook)
- Loading state com skeleton enquanto carrega

**Compatibilidade:**
- `suggestCategoria()` em categorias.ts continua lendo localStorage como fallback para a tela de Conciliacao
- A migracao copia os dados para Supabase; localStorage nao e apagado (backup read-only)

---

### ETAPA 4: Aprimorar Edge Function `omie-financeiro`

**Modificar: `supabase/functions/omie-financeiro/index.ts`**

Adicionar aos interfaces `OmieContaReceber` e `OmieContaPagar`:
- Campos de impostos retidos: valor_inss, valor_ir, valor_iss, valor_pis, valor_cofins, valor_csll
- Campo categorias (array de rateio)
- codigo_tipo_documento, id_conta_corrente

Adicionar ao mapeamento arRecord/apRecord:
- Os novos campos extraidos do titulo Omie
- `raw_data: JSON.stringify(titulo)` para auditoria

Adicionar logica de auto-popular mapeamento:
- Coletar todos `codigo_categoria` unicos encontrados durante a sync
- Apos processar titulos, fazer upsert em `omie_categoria_mapeamento` para codigos novos (ignoreDuplicates)

---

### ETAPA 5: Hook useDREData

**Novo arquivo: `src/hooks/useDREData.ts`**

```text
useDREData(ano: number) -> { data: DREDadosMes[], isLoading }

Fluxo:
1. Buscar mapeamentos (omie_categoria_mapeamento + join categorias_contabeis)
2. Montar mapa: codigo_omie -> conta_dre
3. Buscar AR do ano (excluindo CANCELADO), por data_emissao
4. Buscar AP do ano (excluindo CANCELADO), por data_emissao
5. Agregar por conta_dre + mes (regime de competencia)
6. Impostos retidos -> "(-) - Deducoes de Receita"
7. Retornar array DREDadosMes[]
```

Interface DREDadosMes: { conta_dre, mes, ano, total }

Cache: staleTime 5 minutos.

---

### ETAPA 6: Motor DRE com Dados Reais

**Modificar: `src/lib/conciliacao/dre.ts`**

Manter funcoes existentes (`buildDREEstrutura`, `buildDREAnual`) como fallback.

Adicionar novas funcoes:

- `buildDREComDados(periodo, dadosMes[], mes, categorias[])` -- mesma estrutura de secoes, mas popula valores reais:
  - Para cada DRELinha com contaDRE, buscar total em dadosMes onde conta_dre === contaDRE e mes === mesAtual
  - Calcular subtotais cascateando (Receita Liquida = Bruta - Deducoes, Lucro Bruto = RL - Custos, etc.)
  - Categorias vem do Supabase (nomes das categorias vinculadas a cada conta DRE)

- `buildDREAnualComDados(ano, dados[], categorias[])` -- chama buildDREComDados para cada mes (1-12), calcula acumulado somando por conta_dre

---

### ETAPA 7: Pagina de Mapeamento Categorias Omie

**Novo arquivo: `src/pages/MapeamentoCategorias.tsx`**

**Novo hook: `src/hooks/useCategoriaMapeamento.ts`**
- `useMapeamentos()` -- lista todos os mapeamentos
- `useUpdateMapeamento()` -- salvar conta_dre_override e categoria_contabil_id
- `useMapeamentoStats()` -- count de titulos por codigo_omie (AR + AP)

**Layout da pagina:**
- Tabela com colunas: Codigo Omie | Qtd Titulos | Valor Total | Conta DRE (select) | Status
- Filtros: Todos / Mapeados / Nao mapeados
- Sugestao automatica por prefixo (1.01 -> Receita Bruta, 2.05 -> Despesas com Pessoal, etc.)
- Badge: verde "Mapeado", amarelo "Pendente"
- Botao "Salvar" por linha ou em lote

---

### ETAPA 8: Atualizar FinanceiroDRE.tsx

**Mudancas no arquivo existente (752 linhas):**

- Importar `useDREData` e `useCategorias`
- Substituir `buildDREEstrutura(periodo)` por `buildDREComDados(periodo, dreData, mesNum, categorias)` com fallback
- Substituir `buildDREAnual(ano)` por `buildDREAnualComDados(ano, dreData, categorias)` com fallback
- Adicionar loading state (skeleton nos KPIs e tabela)
- Adicionar badge "Dados Omie" verde quando dados reais presentes
- Adicionar alerta quando sem dados sincronizados

---

### ETAPA 9: Painel de Sincronizacao

**Novo arquivo: `src/components/financeiro/OmieSyncPanel.tsx`**

- Reaproveitar logica do `SyncButton.tsx` existente
- Adicionar filtros: data_inicio, data_fim, tipo (AR/AP/Todos)
- Tabela de historico de sincronizacoes (lendo `omie_sync_log`)
- Cards de estatisticas: total AR, total AP, categorias nao mapeadas, ultima sync
- Acessivel via pagina Financeiro (adicionar como sub-rota ou componente na pagina DRE)

---

### ETAPA 10: Navegacao

**Modificar: `src/components/AppSidebar.tsx`**
- Adicionar item "Mapeamento Omie" no menu Financeiro (url: `/financeiro/mapeamento-categorias`)

**Modificar: `src/components/Layout.tsx`**
- Adicionar rota `/financeiro/mapeamento-categorias` ao mapeamento `routeToArea`

**Modificar: `src/App.tsx`**
- Adicionar rota `<Route path="/financeiro/mapeamento-categorias" element={<MapeamentoCategorias />} />`

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useCategorias.ts` | CRUD categorias via Supabase |
| `src/hooks/useDREData.ts` | Agregacao AR/AP por conta DRE e mes |
| `src/hooks/useCategoriaMapeamento.ts` | CRUD mapeamento Omie -> DRE |
| `src/pages/MapeamentoCategorias.tsx` | Tela de mapeamento |
| `src/components/financeiro/OmieSyncPanel.tsx` | Painel de sincronizacao |

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/omie-financeiro/index.ts` | Novos campos, auto-popular mapeamento |
| `src/lib/conciliacao/dre.ts` | Adicionar buildDREComDados/buildDREAnualComDados |
| `src/pages/FinanceiroDRE.tsx` | Conectar ao useDREData, loading, badge |
| `src/pages/FinanceiroCategorias.tsx` | Migrar localStorage -> Supabase |
| `src/components/AppSidebar.tsx` | Link mapeamento categorias |
| `src/components/Layout.tsx` | routeToArea |
| `src/App.tsx` | Nova rota |

## Arquivos NAO Alterados

- `src/lib/conciliacao/categorias.ts` -- mantido como fallback/compatibilidade
- `src/pages/Conciliacao.tsx` -- sem mudancas
- `src/lib/conciliacao/parsers.ts`, `matcher.ts`, `classifier.ts`, `engine.ts`, `outputs.ts`

---

## Consideracoes de Seguranca

- Todas tabelas novas com RLS habilitada
- Leitura: `has_any_role(auth.uid())`
- Escrita: `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'super_admin')`
- Edge Function mantem autenticacao JWT existente
- Dados sensíveis protegidos pelas mesmas politicas das tabelas Omie existentes

## Compatibilidade

- Se Supabase vazio: DRE funciona como antes (estrutura com zeros)
- Se localStorage tem dados e Supabase vazio: mostra opcao "Migrar"
- Funcoes existentes mantidas como fallback
- Nenhuma coluna existente alterada ou removida

