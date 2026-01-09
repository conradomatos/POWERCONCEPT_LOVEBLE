
-- Create the consolidated view that UNIONs real appointments with pending ones
CREATE OR REPLACE VIEW public.vw_apontamentos_consolidado AS
-- Part A: Real appointments (imported + manual)
SELECT 
  id,
  origem,
  arquivo_importacao_id,
  linha_arquivo,
  data_importacao,
  usuario_lancamento,
  projeto_id,
  projeto_nome,
  os_numero,
  tarefa_id,
  tarefa_nome,
  centro_custo,
  funcionario_id,
  cpf,
  nome_funcionario,
  data_apontamento,
  horas,
  tipo_hora,
  descricao,
  observacao,
  status_apontamento,
  status_integracao,
  motivo_erro,
  gantt_atualizado,
  data_atualizacao_gantt,
  created_at,
  updated_at,
  false as is_pending
FROM public.apontamentos_consolidado

UNION ALL

-- Part B: Pending appointments (from planning that don't have real appointments)
SELECT
  ab.id,
  'SISTEMA'::apontamento_origem as origem,
  NULL::uuid as arquivo_importacao_id,
  NULL::integer as linha_arquivo,
  NULL::timestamptz as data_importacao,
  NULL::uuid as usuario_lancamento,
  ab.projeto_id,
  p.nome as projeto_nome,
  p.os as os_numero,
  NULL::uuid as tarefa_id,
  NULL::text as tarefa_nome,
  NULL::text as centro_custo,
  ab.colaborador_id as funcionario_id,
  c.cpf,
  c.full_name as nome_funcionario,
  d.date_val as data_apontamento,
  0::numeric as horas,
  'NORMAL'::tipo_hora as tipo_hora,
  NULL::text as descricao,
  ab.observacao,
  'NAO_LANCADO'::apontamento_status as status_apontamento,
  'PENDENTE'::integracao_status as status_integracao,
  NULL::text as motivo_erro,
  false as gantt_atualizado,
  NULL::timestamptz as data_atualizacao_gantt,
  ab.created_at,
  ab.updated_at,
  true as is_pending
FROM public.alocacoes_blocos ab
CROSS JOIN LATERAL (
  SELECT generate_series(ab.data_inicio, ab.data_fim, '1 day'::interval)::date as date_val
) d
JOIN public.collaborators c ON c.id = ab.colaborador_id
JOIN public.projetos p ON p.id = ab.projeto_id
WHERE ab.tipo = 'planejado'
  -- Anti-join: exclude dates that already have real appointments
  AND NOT EXISTS (
    SELECT 1 
    FROM public.apontamentos_consolidado ac
    WHERE ac.funcionario_id = ab.colaborador_id
      AND ac.projeto_id = ab.projeto_id
      AND ac.data_apontamento = d.date_val
  );

-- Grant access to the view
GRANT SELECT ON public.vw_apontamentos_consolidado TO authenticated;
