-- Corrigir search_path nas funcoes existentes

CREATE OR REPLACE FUNCTION public.recalc_totais_apontamento_dia()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  v_dia_id uuid;
begin
  v_dia_id := coalesce(new.apontamento_dia_id, old.apontamento_dia_id);

  update public.apontamento_dia d
  set total_horas_apontadas = coalesce((
    select sum(i.horas) from public.apontamento_item i where i.apontamento_dia_id = v_dia_id
  ),0),
  updated_at = now()
  where d.id = v_dia_id;

  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.sync_apontamento_dia_from_secullum()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  v_colab uuid;
  v_data date;
  v_total numeric;
begin
  v_colab := coalesce(new.colaborador_id, old.colaborador_id);
  v_data  := coalesce(new.data, old.data);

  select coalesce(horas_normal,0) + coalesce(horas_extra50,0) + coalesce(horas_extra100,0)
    into v_total
  from public.vw_secullum_base_dia
  where colaborador_id = v_colab and data = v_data;

  insert into public.apontamento_dia (colaborador_id, data, horas_base_dia, fonte_base)
  values (v_colab, v_data, coalesce(v_total,0), 'SECULLUM'::public.apontamento_fonte_base)
  on conflict (colaborador_id, data)
  do update set
    horas_base_dia = coalesce(v_total,0),
    fonte_base     = 'SECULLUM'::public.apontamento_fonte_base,
    updated_at     = now()
  where public.apontamento_dia.status = 'RASCUNHO'::public.apontamento_dia_status;

  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.validar_rateio_planejamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  v_is_bloco boolean;
  v_parent uuid;
  v_has_percent boolean;
  v_has_horas boolean;
  v_sum_percent numeric;
begin
  v_is_bloco := (tg_table_name = 'alocacoes_blocos_rateio');
  v_parent := case when v_is_bloco then coalesce(new.alocacao_bloco_id, old.alocacao_bloco_id)
                   else coalesce(new.alocacao_padrao_id, old.alocacao_padrao_id) end;

  if v_is_bloco then
    select
      bool_or(percentual is not null),
      bool_or(horas_dia is not null),
      coalesce(sum(percentual),0)
    into v_has_percent, v_has_horas, v_sum_percent
    from public.alocacoes_blocos_rateio
    where alocacao_bloco_id = v_parent;
  else
    select
      bool_or(percentual is not null),
      bool_or(horas_dia is not null),
      coalesce(sum(percentual),0)
    into v_has_percent, v_has_horas, v_sum_percent
    from public.alocacoes_padrao_rateio
    where alocacao_padrao_id = v_parent;
  end if;

  if v_has_percent and v_has_horas then
    raise exception 'Rateio misto não permitido (percentual e horas_dia)';
  end if;

  if v_has_percent and round(v_sum_percent, 6) <> 100 then
    raise exception 'Rateio por percentual deve somar 100 (atual=%)', v_sum_percent;
  end if;

  return null;
end $function$;