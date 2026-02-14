

# FIX 01 -- Performance da sincronizacao Omie (Edge Function)

## Problema

A Edge Function `omie-financeiro` processa cada titulo individualmente com SELECT+INSERT/UPDATE sequenciais. Com 500 titulos por pagina, isso gera 3.000+ queries que estouraram o timeout de 150s.

## Solucao

Substituir processamento individual por batch upsert em chunks de 100, reduzindo ~3.000 queries para ~20.

## Mudancas no arquivo `supabase/functions/omie-financeiro/index.ts`

### 1. Corrigir autenticacao (linhas 187-196)

Substituir `auth.getClaims(token)` por `auth.getUser()`:

```text
// De:
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
const userId = claimsData.claims.sub;

// Para:
const { data: { user }, error: authError } = await userClient.auth.getUser();
const userId = user.id;
```

### 2. Batch upsert AR (linhas 337-441)

Substituir o loop individual por:
- Acumular registros em `arBatch[]` e pendencias em `pendenciasBatchAR[]`
- Apos o loop, fazer `supabase.from('omie_contas_receber').upsert(chunk, { onConflict: 'id_omie_titulo' })` em chunks de 100
- Para pendencias: buscar os IDs reais dos titulos inseridos via `.in('id_omie_titulo', omieIds)`, montar array de pendencias com `referencia_id` correto, e fazer insert em batch

### 3. Batch upsert AP (linhas 490-591)

Mesma logica do AR aplicada para contas a pagar:
- Acumular em `apBatch[]` e `pendenciasBatchAP[]`
- Upsert em chunks de 100 na tabela `omie_contas_pagar`
- Campos ajustados: `fornecedor` em vez de `cliente`, `valor_pago` em vez de `valor_recebido`, `data_pagamento` em vez de `data_recebimento`, origem `OMIE_AP`

### 4. Batch upsert de categorias (linhas 601-608)

Substituir loop individual por upsert unico:
```text
const catBatch = Array.from(categoriasEncontradas).map(codigo => ({ codigo_omie: codigo }));
await supabase.from('omie_categoria_mapeamento').upsert(catBatch, { onConflict: 'codigo_omie', ignoreDuplicates: true });
```

### 5. Contagem simplificada

Como `upsert` nao diferencia new vs update, a contagem sera simplificada:
- `totalNew` recebe o total de registros processados por batch (contagem aproximada)
- `totalUpdated` permanece 0 (nao ha como diferenciar sem query extra)

## O que NAO muda

- Estrutura de dados gravada (mesmos campos, mesmos valores)
- Console.logs de debug
- Delay de 200ms entre paginas da API Omie
- Logica de categorias e pendencias (apenas forma de gravar)
- Nenhum outro arquivo alterado

## Resultado esperado

- Tempo de sync reduzido de 2-3 min para 10-20 segundos
- Sem timeout da Edge Function
- Mesmos dados gravados no banco

