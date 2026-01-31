-- Recreate the view vw_apontamentos_consolidado with 3 UNIONs
-- Part B includes daily appointments from apontamento_item
-- Part C excludes days that already have appointments in apontamento_item
-- Mapping tipo_hora_ext to tipo_hora: EXTRA50->H50, EXTRA100->H100

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
  -- Map tipo_hora_ext to tipo_hora
  CASE ai.tipo_hora::text
    WHEN 'NORMAL' THEN 'NORMAL'::tipo_hora
    WHEN 'EXTRA50' THEN 'H50'::tipo_hora
    WHEN 'EXTRA100' THEN 'H100'::tipo_hora
    ELSE 'NORMAL'::tipo_hora
  END AS tipo_hora,
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