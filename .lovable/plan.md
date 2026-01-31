

# Integracao: Apontamentos Diarios na View Consolidada e Gantt

## Problema Identificado

Os apontamentos lancados no modulo "Apontamento Diario" (salvos em `apontamento_dia` + `apontamento_item`) nao aparecem em:

1. **Tela Apontamentos** - le da view `vw_apontamentos_consolidado` que nao inclui dados de `apontamento_item`
2. **Tela Planejamento Gantt** - botao "Puxar Apontamentos" le de `apontamentos_horas_dia` (tem apenas 1 registro)

### Dados Encontrados

| Tabela | Registros |
|--------|-----------|
| `apontamento_item` | 6 registros com horas > 0 |
| `apontamentos_horas_dia` | 1 registro (quase vazia) |
| `apontamentos_consolidado` | Dados de importacao/manual antigos |

---

## Solucao em 2 Partes

### Parte 1: Atualizar View `vw_apontamentos_consolidado`

Adicionar um terceiro UNION ALL para incluir dados de `apontamento_item`:

```sql
DROP VIEW IF EXISTS public.vw_apontamentos_consolidado;

CREATE VIEW public.vw_apontamentos_consolidado 
WITH (security_invoker = true) AS

-- Part A: Apontamentos existentes (importados/manuais antigos)
SELECT 
  id, origem, arquivo_importacao_id, linha_arquivo, data_importacao,
  usuario_lancamento, projeto_id, projeto_nome, os_numero, tarefa_id,
  tarefa_nome, centro_custo, funcionario_id, cpf, nome_funcionario,
  data_apontamento, horas, tipo_hora, descricao, observacao,
  status_apontamento, status_integracao, motivo_erro, gantt_atualizado,
  data_atualizacao_gantt, created_at, updated_at,
  false AS is_pending
FROM apontamentos_consolidado

UNION ALL

-- Part B: Apontamentos do modulo diario (apontamento_dia + apontamento_item)
SELECT 
  ai.id,
  'MANUAL'::apontamento_origem AS origem,
  NULL::uuid AS arquivo_importacao_id,
  NULL::integer AS linha_arquivo,
  NULL::timestamp with time zone AS data_importacao,
  ad.created_by AS usuario_lancamento,
  ai.projeto_id,
  p.nome AS projeto_nome,
  p.os AS os_numero,
  ai.atividade_id AS tarefa_id,
  NULL::text AS tarefa_nome,
  NULL::text AS centro_custo,
  ad.colaborador_id AS funcionario_id,
  c.cpf,
  c.full_name AS nome_funcionario,
  ad.data AS data_apontamento,
  ai.horas,
  ai.tipo_hora,
  ai.descricao,
  ad.observacao,
  'LANCADO'::apontamento_status AS status_apontamento,
  'OK'::integracao_status AS status_integracao,
  NULL::text AS motivo_erro,
  false AS gantt_atualizado,
  NULL::timestamp with time zone AS data_atualizacao_gantt,
  ai.created_at,
  ai.updated_at,
  false AS is_pending
FROM apontamento_item ai
JOIN apontamento_dia ad ON ad.id = ai.apontamento_dia_id
JOIN collaborators c ON c.id = ad.colaborador_id
JOIN projetos p ON p.id = ai.projeto_id
WHERE ai.horas > 0

UNION ALL

-- Part C: Expectativas pendentes (alocacoes planejadas sem apontamento)
SELECT 
  ab.id,
  'SISTEMA'::apontamento_origem AS origem,
  NULL::uuid AS arquivo_importacao_id,
  NULL::integer AS linha_arquivo,
  NULL::timestamp with time zone AS data_importacao,
  NULL::uuid AS usuario_lancamento,
  ab.projeto_id,
  p.nome AS projeto_nome,
  p.os AS os_numero,
  NULL::uuid AS tarefa_id,
  NULL::text AS tarefa_nome,
  NULL::text AS centro_custo,
  ab.colaborador_id AS funcionario_id,
  c.cpf,
  c.full_name AS nome_funcionario,
  d.date_val AS data_apontamento,
  0::numeric AS horas,
  'NORMAL'::tipo_hora AS tipo_hora,
  NULL::text AS descricao,
  ab.observacao,
  'NAO_LANCADO'::apontamento_status AS status_apontamento,
  'PENDENTE'::integracao_status AS status_integracao,
  NULL::text AS motivo_erro,
  false AS gantt_atualizado,
  NULL::timestamp with time zone AS data_atualizacao_gantt,
  ab.created_at,
  ab.updated_at,
  true AS is_pending
FROM alocacoes_blocos ab
CROSS JOIN LATERAL (
  SELECT generate_series(ab.data_inicio::timestamp, ab.data_fim::timestamp, '1 day'::interval)::date AS date_val
) d
JOIN collaborators c ON c.id = ab.colaborador_id
JOIN projetos p ON p.id = ab.projeto_id
WHERE ab.tipo = 'planejado'
  -- Excluir dias que ja tem apontamento em apontamentos_consolidado
  AND NOT EXISTS (
    SELECT 1 FROM apontamentos_consolidado ac
    WHERE ac.funcionario_id = ab.colaborador_id
      AND ac.projeto_id = ab.projeto_id
      AND ac.data_apontamento = d.date_val
  )
  -- Excluir dias que ja tem apontamento em apontamento_item
  AND NOT EXISTS (
    SELECT 1 FROM apontamento_item ai2
    JOIN apontamento_dia ad2 ON ad2.id = ai2.apontamento_dia_id
    WHERE ad2.colaborador_id = ab.colaborador_id
      AND ai2.projeto_id = ab.projeto_id
      AND ad2.data = d.date_val
      AND ai2.horas > 0
  );

GRANT SELECT ON public.vw_apontamentos_consolidado TO authenticated;
```

### Parte 2: Atualizar `handlePullApontamentos` em Planejamento.tsx

Mudar a query de `apontamentos_horas_dia` para ler de `apontamento_item`:

```typescript
// Linha 438-443 atual:
const { data: apontamentos, error: aptError } = await supabase
  .from('apontamentos_horas_dia')
  .select('colaborador_id, projeto_id, data')
  ...

// Mudar para:
const { data: rawApontamentos, error: aptError } = await supabase
  .from('apontamento_item')
  .select(`
    id,
    projeto_id,
    horas,
    apontamento_dia!inner (
      colaborador_id,
      data
    )
  `)
  .gt('horas', 0)
  .gte('apontamento_dia.data', format(period.start, 'yyyy-MM-dd'))
  .lte('apontamento_dia.data', format(period.end, 'yyyy-MM-dd'));

if (aptError) throw aptError;

// Transformar para formato esperado
const apontamentos = (rawApontamentos || []).map(item => ({
  colaborador_id: item.apontamento_dia.colaborador_id,
  projeto_id: item.projeto_id,
  data: item.apontamento_dia.data,
}));
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| **Supabase Migration** | Recriar view `vw_apontamentos_consolidado` com 3 UNIONs |
| `src/pages/Planejamento.tsx` | Alterar query na funcao `handlePullApontamentos` (linhas 438-464) |

---

## Resultado Esperado

| Tela | Comportamento Apos Correcao |
|------|----------------------------|
| Apontamentos | Mostra lancamentos do modulo diario com origem="MANUAL", status="LANCADO" |
| Planejamento Gantt | Botao "Puxar Apontamentos" cria blocos verdes baseados em `apontamento_item` |

---

## Testes

1. Lancar horas no Apontamento Diario (colaborador X, projeto Y, 4 horas)
2. Ir em Apontamentos → Verificar linha com origem "MANUAL", status "LANCADO", 4h
3. Ir em Planejamento Gantt → Clicar "Puxar Apontamentos" → Barra verde criada para colaborador X

