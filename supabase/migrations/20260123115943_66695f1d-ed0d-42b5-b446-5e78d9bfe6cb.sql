-- Add horas_previstas column to projetos table
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS horas_previstas INTEGER DEFAULT NULL;
COMMENT ON COLUMN projetos.horas_previstas IS 'Total de horas previstas para o projeto';

-- Recreate the view with new calculated fields for hours deviation
DROP VIEW IF EXISTS vw_rentabilidade_projeto;

CREATE VIEW vw_rentabilidade_projeto AS
WITH receitas AS (
  SELECT 
    projeto_id,
    SUM(valor) AS receita_competencia,
    SUM(valor_recebido) AS receita_caixa,
    SUM(valor - COALESCE(valor_recebido, 0)) AS a_receber,
    COUNT(*) FILTER (WHERE status = 'ATRASADO') AS titulos_atrasados_ar
  FROM omie_contas_receber
  GROUP BY projeto_id
),
custos_diretos AS (
  SELECT 
    projeto_id,
    SUM(valor) AS custo_direto_competencia,
    SUM(valor) AS custo_direto_caixa
  FROM custos_diretos_projeto
  GROUP BY projeto_id
),
contas_pagar AS (
  SELECT 
    projeto_id,
    SUM(valor - COALESCE(valor_pago, 0)) AS a_pagar,
    COUNT(*) FILTER (WHERE status = 'ATRASADO') AS titulos_atrasados_ap
  FROM omie_contas_pagar
  GROUP BY projeto_id
),
mao_obra AS (
  SELECT 
    projeto_id,
    SUM(custo_total) AS custo_mao_obra,
    SUM(horas_normais + horas_50 + horas_100 + horas_noturnas) AS horas_totais,
    COUNT(*) FILTER (WHERE status = 'SEM_CUSTO') AS registros_sem_custo
  FROM custo_projeto_dia
  GROUP BY projeto_id
),
pendencias AS (
  SELECT 
    projeto_id,
    COUNT(*) AS pendencias_abertas
  FROM pendencias_financeiras
  WHERE status = 'ABERTA'
  GROUP BY projeto_id
)
SELECT 
  p.id AS projeto_id,
  p.os AS projeto_os,
  p.nome AS projeto_nome,
  p.status_projeto,
  p.tipo_contrato,
  p.valor_contrato,
  p.tem_aditivos,
  p.valor_aditivos_previsto,
  COALESCE(p.valor_contrato, 0) + COALESCE(p.valor_aditivos_previsto, 0) AS valor_total_contrato,
  p.omie_codigo,
  p.data_inicio_real,
  p.data_fim_real,
  p.data_inicio_planejada,
  p.data_fim_planejada,
  p.empresa_id,
  p.horas_previstas,
  e.codigo AS cliente_codigo,
  e.razao_social AS cliente_nome,
  COALESCE(r.receita_competencia, 0) AS receita_competencia,
  COALESCE(r.receita_caixa, 0) AS receita_caixa,
  COALESCE(r.a_receber, 0) AS a_receber,
  COALESCE(r.titulos_atrasados_ar, 0) AS titulos_atrasados_ar,
  COALESCE(cd.custo_direto_competencia, 0) AS custo_direto_competencia,
  COALESCE(cd.custo_direto_caixa, 0) AS custo_direto_caixa,
  COALESCE(cp.a_pagar, 0) AS a_pagar,
  COALESCE(cp.titulos_atrasados_ap, 0) AS titulos_atrasados_ap,
  COALESCE(mo.custo_mao_obra, 0) AS custo_mao_obra,
  COALESCE(mo.horas_totais, 0) AS horas_totais,
  COALESCE(mo.registros_sem_custo, 0) AS registros_sem_custo,
  -- Calculated fields for hours deviation
  CASE 
    WHEN p.horas_previstas IS NOT NULL AND p.horas_previstas > 0 
    THEN COALESCE(mo.horas_totais, 0) - p.horas_previstas
    ELSE NULL
  END AS desvio_horas,
  CASE 
    WHEN p.horas_previstas IS NOT NULL AND p.horas_previstas > 0 
    THEN ROUND(((COALESCE(mo.horas_totais, 0) - p.horas_previstas) / p.horas_previstas::numeric * 100), 1)
    ELSE NULL
  END AS desvio_horas_pct,
  -- Resultado e margem por competencia
  COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0) AS resultado_competencia,
  -- Saldo de caixa
  COALESCE(r.receita_caixa, 0) - COALESCE(cd.custo_direto_caixa, 0) AS saldo_caixa,
  -- Margem por competencia
  CASE 
    WHEN COALESCE(r.receita_competencia, 0) > 0 
    THEN ROUND(((COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0)) / r.receita_competencia * 100), 1)
    ELSE NULL
  END AS margem_competencia_pct,
  -- Margem por caixa
  CASE 
    WHEN COALESCE(r.receita_caixa, 0) > 0 
    THEN ROUND(((COALESCE(r.receita_caixa, 0) - COALESCE(cd.custo_direto_caixa, 0)) / r.receita_caixa * 100), 1)
    ELSE NULL
  END AS margem_caixa_pct,
  -- Custo medio por hora
  CASE 
    WHEN COALESCE(mo.horas_totais, 0) > 0 
    THEN ROUND(COALESCE(mo.custo_mao_obra, 0) / mo.horas_totais, 2)
    ELSE NULL
  END AS custo_medio_hora,
  -- Receita por hora
  CASE 
    WHEN COALESCE(mo.horas_totais, 0) > 0 
    THEN ROUND(COALESCE(r.receita_competencia, 0) / mo.horas_totais, 2)
    ELSE NULL
  END AS receita_por_hora,
  COALESCE(pf.pendencias_abertas, 0) AS pendencias_abertas,
  -- Status da margem
  CASE 
    WHEN COALESCE(r.receita_competencia, 0) = 0 THEN 'sem_receita'
    WHEN ((COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0)) / r.receita_competencia * 100) >= 20 THEN 'saudavel'
    WHEN ((COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0)) / r.receita_competencia * 100) >= 0 THEN 'atencao'
    ELSE 'critico'
  END AS status_margem
FROM projetos p
LEFT JOIN empresas e ON p.empresa_id = e.id
LEFT JOIN receitas r ON p.id = r.projeto_id
LEFT JOIN custos_diretos cd ON p.id = cd.projeto_id
LEFT JOIN contas_pagar cp ON p.id = cp.projeto_id
LEFT JOIN mao_obra mo ON p.id = mo.projeto_id
LEFT JOIN pendencias pf ON p.id = pf.projeto_id
WHERE p.is_sistema = false OR p.is_sistema IS NULL;