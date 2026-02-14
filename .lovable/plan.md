

# FIX-03 -- Auto-mapeamento de categorias DRE via API Omie

## Resumo

Corrigir os prefixos errados na funcao `suggestContaDRE` e adicionar chamada ao endpoint `ListarCadastroDRE` do Omie na Edge Function para trazer descricoes das categorias.

## Arquivos a modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/omie-financeiro/index.ts` | **EDITAR** | Adicionar chamada ListarCadastroDRE antes do sync de titulos |
| `src/hooks/useCategoriaMapeamento.ts` | **EDITAR** | Reescrever suggestContaDRE com prefixos corretos |

## Detalhes tecnicos

### 1. Edge Function: Adicionar etapa ListarCadastroDRE

Inserir logo apos o carregamento dos projetos (linha ~316) e antes do sync AR (linha 318), um bloco que:

- Chama `https://app.omie.com.br/api/v1/geral/dre/` com `call: "ListarCadastroDRE"` e `param: [{"apenasContasAtivas": "N"}]`
- Filtra itens onde `nivelDRE === 3` (contas-folha)
- Para cada conta-folha, faz update na tabela `omie_categoria_mapeamento` setando `descricao_omie = descricaoDRE` onde `codigo_omie = codigoDRE`
- Usa update (nao upsert) para nao criar registros novos -- apenas atualiza descricoes dos que ja existem
- Se a chamada falhar, loga o erro e continua o sync normalmente

### 2. Reescrever suggestContaDRE

Substituir a funcao nas linhas 107-117 do `useCategoriaMapeamento.ts` pela versao correta que mapeia:

- `1.01.01` para Receita Bruta de Vendas
- `1.01.02` e `1.01.03` para Deducoes de Receita
- `1.11.01` e `1.11.02` para Receita Bruta de Vendas
- `1.11.03` para Deducoes de Receita
- `1.21.xx` para Custo dos Servicos Prestados (CRITICO -- antes caia como receita)
- `2.01.xx` para Despesas Variaveis
- `2.11.01` para Despesas com Pessoal
- `2.11.02` para Despesas Administrativas
- `2.11.03` para Despesas Administrativas (Financeiras agrupadas)
- `2.11.04` para Despesas de Vendas e Marketing
- `2.11.05` e `2.11.10` para Despesas Administrativas
- `3.xx` para Despesas Administrativas (Investimentos)

### 3. Pagina MapeamentoCategorias.tsx

Nao precisa de alteracoes. O botao "Sugerir" (handleAutoSuggest) ja usa a logica correta de fallback por prefixo internamente (nao chama suggestContaDRE). A correcao do suggestContaDRE beneficia apenas chamadas diretas a essa funcao exportada.

## O que NAO muda

- Estrutura da DRE (secoes, subtotais, calculos)
- Layout das paginas
- Aliquotas de impostos
- Logica de sync de titulos financeiros (AR/AP)
- Tabelas SQL ou migrations

## Resultado esperado

- Categorias terao descricao correta apos proximo sync (ex: "Receita Bruta de Vendas" em vez de "---")
- Custos (1.21.xx) classificados corretamente como custos na DRE
- Botao "Sugerir" na pagina de mapeamento continuara funcionando com fallback por prefixo

