

# FIX-04 -- Corrigir campos ListarCategorias + Botao Sincronizar

## Resumo

Tres alteracoes: (1) remover bloco ListarCadastroDRE que nunca da match, (2) melhorar ListarCategorias com campos defensivos e logging completo, (3) adicionar botao "Sincronizar Omie" e texto de orientacao na pagina de mapeamento.

## 1. Edge Function: Remover ListarCadastroDRE e reescrever ListarCategorias

**Arquivo:** `supabase/functions/omie-financeiro/index.ts`

### 1A. Remover bloco ListarCadastroDRE (linhas 318-354)

O bloco tenta fazer `.eq('codigo_omie', conta.codigoDRE)` mas `codigoDRE` contem codigos de conta DRE (ex: "1.21.02"), nao codigos de categoria Omie (ex: "2.01.03"). Nunca da match. Remover inteiro.

### 1B. Reescrever bloco ListarCategorias (linhas 356-435)

Substituir pelo codigo defensivo que:
- Loga as chaves do primeiro objeto: `Object.keys(categorias[0])`
- Loga o objeto completo: `JSON.stringify(categorias[0], null, 2)`
- Tenta multiplos nomes de campo para codigo: `cat.codigo || cat.cCodCateg`
- Tenta multiplos nomes para descricao: `cat.descricao || cat.descricao_categoria || cat.cDescrCateg || cat.nome || cat.categoria || codigo`
- Tenta multiplos nomes para conta DRE: `cat.conta_dre || cat.contaDRE || cat.cContaDRE || cat.id_conta_dre || cat.conta_despesa || cat.conta_receita || cat.definicao?.cContaDRE || cat.descricao_padrao || ''`
- Atualiza `descricao_omie` sempre (nao apenas quando tem contaDre)
- Atualiza `conta_dre_omie` quando disponivel

## 2. Pagina MapeamentoCategorias: botao Sincronizar + texto orientacao

**Arquivo:** `src/pages/MapeamentoCategorias.tsx`

### 2A. Adicionar import RefreshCw e estado syncing

### 2B. Adicionar funcao handleSync

Chama `supabase.functions.invoke('omie-financeiro', { body: { tipo: 'TODOS' } })`. Ao finalizar, faz `window.location.reload()` para recarregar os dados.

### 2C. Adicionar botao na toolbar

Botao "Sincronizar Omie" com icone RefreshCw animado durante sync, posicionado antes do botao "Sugerir".

### 2D. Melhorar texto de descricao vazia

Substituir `{m.descricao_omie || '---'}` por `{m.descricao_omie || <span className="italic text-amber-500">Sincronize para carregar</span>}`.

## O que NAO muda

- Hook `useCategoriaMapeamento.ts` (suggestContaDRE e mapa OMIE_DRE_TO_POWERCONCEPT ja estao corretos)
- Estrutura da DRE, calculos, aliquotas
- Logica de sync de titulos AR/AP
- Botao Expandir/Recolher (ja corrigido no FIX-03)

## Resultado esperado

1. Usuario clica "Sincronizar Omie" na pagina de mapeamento
2. Edge function chama ListarCategorias com logging defensivo
3. Descricoes e contas DRE sao gravadas na tabela
4. Pagina recarrega mostrando descricoes reais e coluna "DRE Omie" preenchida
5. Usuario clica "Sugerir" e o mapeamento automatico funciona corretamente
