-- =============================================
-- VIEW: vw_rentabilidade_projeto
-- Calcula KPIs de rentabilidade por projeto
-- =============================================

CREATE OR REPLACE VIEW public.vw_rentabilidade_projeto AS
WITH 
-- Receitas do Omie (Contas a Receber)
receitas AS (
  SELECT 
    ar.projeto_id,
    COALESCE(SUM(CASE WHEN ar.status != 'CANCELADO' THEN ar.valor ELSE 0 END), 0) as receita_competencia,
    COALESCE(SUM(ar.valor_recebido), 0) as receita_caixa,
    COALESCE(SUM(CASE WHEN ar.status IN ('ABERTO', 'ATRASADO', 'PARCIAL') THEN ar.valor - ar.valor_recebido ELSE 0 END), 0) as a_receber,
    COUNT(CASE WHEN ar.status = 'ATRASADO' THEN 1 END) as titulos_atrasados_ar
  FROM public.omie_contas_receber ar
  GROUP BY ar.projeto_id
),

-- Custos Diretos do Omie (Contas a Pagar)
custos_diretos AS (
  SELECT 
    ap.projeto_id,
    COALESCE(SUM(CASE WHEN ap.status != 'CANCELADO' THEN ap.valor ELSE 0 END), 0) as custo_direto_competencia,
    COALESCE(SUM(ap.valor_pago), 0) as custo_direto_caixa,
    COALESCE(SUM(CASE WHEN ap.status IN ('ABERTO', 'ATRASADO', 'PARCIAL') THEN ap.valor - ap.valor_pago ELSE 0 END), 0) as a_pagar,
    COUNT(CASE WHEN ap.status = 'ATRASADO' THEN 1 END) as titulos_atrasados_ap
  FROM public.omie_contas_pagar ap
  GROUP BY ap.projeto_id
),

-- Custo de Mão de Obra (gerencial - do sistema)
mao_obra AS (
  SELECT 
    cpd.projeto_id,
    COALESCE(SUM(cpd.custo_total), 0) as custo_mao_obra,
    COALESCE(SUM(cpd.horas_normais + cpd.horas_50 + cpd.horas_100 + cpd.horas_noturnas), 0) as horas_totais,
    COUNT(CASE WHEN cpd.status = 'SEM_CUSTO' THEN 1 END) as registros_sem_custo
  FROM public.custo_projeto_dia cpd
  GROUP BY cpd.projeto_id
),

-- Pendências
pendencias AS (
  SELECT 
    pf.projeto_id,
    COUNT(CASE WHEN pf.status = 'ABERTA' THEN 1 END) as pendencias_abertas
  FROM public.pendencias_financeiras pf
  GROUP BY pf.projeto_id
)

SELECT 
  p.id as projeto_id,
  p.nome as projeto_nome,
  p.os as projeto_os,
  p.status_projeto,
  p.tipo_contrato,
  p.valor_contrato,
  p.tem_aditivos,
  p.valor_aditivos_previsto,
  COALESCE(p.valor_contrato, 0) + COALESCE(p.valor_aditivos_previsto, 0) as valor_total_contrato,
  p.omie_codigo,
  p.data_inicio_real,
  p.data_fim_real,
  p.data_inicio_planejada,
  p.data_fim_planejada,
  
  -- Dados da empresa/cliente
  e.id as empresa_id,
  e.empresa as cliente_nome,
  e.codigo as cliente_codigo,
  
  -- Receitas
  COALESCE(r.receita_competencia, 0) as receita_competencia,
  COALESCE(r.receita_caixa, 0) as receita_caixa,
  COALESCE(r.a_receber, 0) as a_receber,
  COALESCE(r.titulos_atrasados_ar, 0) as titulos_atrasados_ar,
  
  -- Custos Diretos
  COALESCE(cd.custo_direto_competencia, 0) as custo_direto_competencia,
  COALESCE(cd.custo_direto_caixa, 0) as custo_direto_caixa,
  COALESCE(cd.a_pagar, 0) as a_pagar,
  COALESCE(cd.titulos_atrasados_ap, 0) as titulos_atrasados_ap,
  
  -- Mão de Obra (gerencial)
  COALESCE(mo.custo_mao_obra, 0) as custo_mao_obra,
  COALESCE(mo.horas_totais, 0) as horas_totais,
  COALESCE(mo.registros_sem_custo, 0) as registros_sem_custo,
  
  -- Resultados Competência
  COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0) as resultado_competencia,
  
  -- Resultados Caixa (sem MO, que é gerencial)
  COALESCE(r.receita_caixa, 0) - COALESCE(cd.custo_direto_caixa, 0) as saldo_caixa,
  
  -- Margens
  CASE 
    WHEN COALESCE(r.receita_competencia, 0) > 0 
    THEN ROUND(
      ((COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0)) / 
       COALESCE(r.receita_competencia, 0)) * 100, 2
    )
    ELSE 0 
  END as margem_competencia_pct,
  
  CASE 
    WHEN COALESCE(r.receita_caixa, 0) > 0 
    THEN ROUND(
      ((COALESCE(r.receita_caixa, 0) - COALESCE(cd.custo_direto_caixa, 0)) / 
       COALESCE(r.receita_caixa, 0)) * 100, 2
    )
    ELSE 0 
  END as margem_caixa_pct,
  
  -- Custo médio por hora
  CASE 
    WHEN COALESCE(mo.horas_totais, 0) > 0 
    THEN ROUND(COALESCE(mo.custo_mao_obra, 0) / mo.horas_totais, 2)
    ELSE 0 
  END as custo_medio_hora,
  
  -- Receita por hora
  CASE 
    WHEN COALESCE(mo.horas_totais, 0) > 0 
    THEN ROUND(COALESCE(r.receita_competencia, 0) / mo.horas_totais, 2)
    ELSE 0 
  END as receita_por_hora,
  
  -- Pendências
  COALESCE(pen.pendencias_abertas, 0) as pendencias_abertas,
  
  -- Status de margem
  CASE 
    WHEN COALESCE(r.receita_competencia, 0) = 0 THEN 'SEM_DADOS'
    WHEN ((COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0)) / 
          NULLIF(COALESCE(r.receita_competencia, 0), 0)) * 100 >= 20 THEN 'SAUDAVEL'
    WHEN ((COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0)) / 
          NULLIF(COALESCE(r.receita_competencia, 0), 0)) * 100 >= 10 THEN 'ATENCAO'
    WHEN ((COALESCE(r.receita_competencia, 0) - COALESCE(cd.custo_direto_competencia, 0) - COALESCE(mo.custo_mao_obra, 0)) / 
          NULLIF(COALESCE(r.receita_competencia, 0), 0)) * 100 >= 0 THEN 'BAIXA'
    ELSE 'NEGATIVA'
  END as status_margem

FROM public.projetos p
LEFT JOIN public.empresas e ON e.id = p.empresa_id
LEFT JOIN receitas r ON r.projeto_id = p.id
LEFT JOIN custos_diretos cd ON cd.projeto_id = p.id
LEFT JOIN mao_obra mo ON mo.projeto_id = p.id
LEFT JOIN pendencias pen ON pen.projeto_id = p.id
WHERE p.is_sistema = false OR p.is_sistema IS NULL;