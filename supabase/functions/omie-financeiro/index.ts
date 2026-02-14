import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OMIE_FINANCAS_URL = "https://app.omie.com.br/api/v1/financas/contareceber/";
const OMIE_CONTAS_PAGAR_URL = "https://app.omie.com.br/api/v1/financas/contapagar/";

// Valid sync types
const VALID_TIPOS = ['CONTAS_RECEBER', 'CONTAS_PAGAR', 'TODOS'] as const;
type SyncTipo = typeof VALID_TIPOS[number];

interface SyncRequest {
  tipo: SyncTipo;
  data_inicio?: string;
  data_fim?: string;
  apenas_modificados?: boolean;
}

interface OmiePaginatedResponse {
  pagina: number;
  total_de_paginas: number;
  registros: number;
  total_de_registros: number;
  conta_receber_cadastro?: OmieContaReceber[];
  conta_pagar_cadastro?: OmieContaPagar[];
  faultstring?: string;
  faultcode?: string;
}

interface OmieContaReceber {
  codigo_lancamento_omie: number;
  codigo_cliente_fornecedor: number;
  data_vencimento: string;
  valor_documento: number;
  valor_titulo?: number;
  numero_documento?: string;
  observacao?: string;
  status_titulo: string;
  data_emissao?: string;
  data_previsao?: string;
  valor_pis_cofins_csll_retido?: number;
  codigo_categoria?: string;
  codigo_projeto?: number;
  numero_parcela?: string;
  valor_inss?: number;
  valor_ir?: number;
  valor_iss?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_csll?: number;
  categorias?: Array<{ codigo_categoria: string; percentual: number; valor: number }>;
  codigo_tipo_documento?: string;
  id_conta_corrente?: number;
  info_adicionais?: {
    tags?: string[];
    nCodCC?: number;
    cNomeCliente?: string;
    cNumeroNF?: string;
    cCPFCNPJCliente?: string;
  };
  baixa_titulo?: {
    cLiquidado?: string;
    dDtLiquidacao?: string;
    nValPago?: number;
  };
}

interface OmieContaPagar {
  codigo_lancamento_omie: number;
  codigo_cliente_fornecedor: number;
  data_vencimento: string;
  valor_documento: number;
  numero_documento?: string;
  observacao?: string;
  status_titulo: string;
  data_emissao?: string;
  codigo_categoria?: string;
  codigo_projeto?: number;
  numero_parcela?: string;
  valor_inss?: number;
  valor_ir?: number;
  valor_iss?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_csll?: number;
  categorias?: Array<{ codigo_categoria: string; percentual: number; valor: number }>;
  codigo_tipo_documento?: string;
  id_conta_corrente?: number;
  info_adicionais?: {
    tags?: string[];
    nCodCC?: number;
    cNomeFornecedor?: string;
    cNumeroNF?: string;
    cCPFCNPJFornecedor?: string;
  };
  baixa_titulo?: {
    cLiquidado?: string;
    dDtLiquidacao?: string;
    nValPago?: number;
  };
}

// Input validation helpers
function isValidTipo(tipo: unknown): tipo is SyncTipo {
  return typeof tipo === 'string' && VALID_TIPOS.includes(tipo as SyncTipo);
}

function isValidDate(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'Tempo limite excedido ao conectar com Omie';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Erro de conexão com API Omie';
    }
    if (msg.includes('json')) {
      return 'Resposta inválida da API Omie';
    }
  }
  return 'Erro ao processar sincronização';
}

function mapOmieStatus(status: string): 'ABERTO' | 'PAGO' | 'ATRASADO' | 'CANCELADO' | 'PARCIAL' {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower.includes('liquid') || statusLower.includes('pago') || statusLower.includes('receb')) {
    return 'PAGO';
  }
  if (statusLower.includes('cancel')) {
    return 'CANCELADO';
  }
  if (statusLower.includes('parcial')) {
    return 'PARCIAL';
  }
  if (statusLower.includes('atrasa') || statusLower.includes('vencid')) {
    return 'ATRASADO';
  }
  return 'ABERTO';
}

function parseOmieDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  // Omie format: dd/mm/yyyy
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// Helper to upsert in chunks
async function upsertInChunks(
  supabase: any,
  table: string,
  batch: any[],
  conflictColumn: string,
  chunkSize = 100
): Promise<{ error: string | null }> {
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflictColumn });
    if (error) {
      return { error: error.message };
    }
  }
  return { error: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Check for admin, financeiro, or super_admin role
    const { data: roles } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const hasPermission = roles?.some(r => 
      r.role === 'admin' || r.role === 'financeiro' || r.role === 'super_admin'
    );
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Sem permissão para sincronizar dados Omie' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OMIE_APP_KEY = Deno.env.get('OMIE_APP_KEY');
    const OMIE_APP_SECRET = Deno.env.get('OMIE_APP_SECRET');

    if (!OMIE_APP_KEY || !OMIE_APP_SECRET) {
      console.error("Missing Omie credentials");
      return new Response(
        JSON.stringify({ ok: false, error: "Credenciais do Omie não configuradas" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let body: SyncRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Dados de requisição inválidos" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Sync request type:", body.tipo);

    // Validate tipo
    const tipo = body.tipo || 'TODOS';
    if (!isValidTipo(tipo)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Tipo de sincronização inválido" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date fields if provided
    if (body.data_inicio && !isValidDate(body.data_inicio)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Data de início inválida" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.data_fim && !isValidDate(body.data_fim)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Data de fim inválida" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('omie_sync_log')
      .insert({
        tipo: tipo === 'TODOS' ? 'CONTAS_RECEBER' : tipo,
        status: 'INICIADO',
      })
      .select()
      .single();

    if (syncLogError) {
      console.error("Error creating sync log:", syncLogError);
    }

    const syncId = syncLog?.id;
    let totalProcessed = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let pendenciasCreated = 0;
    const errors: string[] = [];
    const categoriasEncontradas = new Set<string>();

    // Fetch all projects with omie_codigo for matching
    const { data: projetos } = await supabase
      .from('projetos')
      .select('id, omie_codigo')
      .not('omie_codigo', 'is', null);

    const projetoMap = new Map<number, string>();
    projetos?.forEach(p => {
      if (p.omie_codigo) {
        projetoMap.set(Number(p.omie_codigo), p.id);
      }
    });

    console.log(`Loaded ${projetoMap.size} projects with omie_codigo`);

    // ── Etapa: ListarCadastroDRE (atualizar descrições das categorias) ──
    try {
      console.log("Fetching DRE catalog from Omie (ListarCadastroDRE)...");
      const dreResponse = await fetch("https://app.omie.com.br/api/v1/geral/dre/", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call: "ListarCadastroDRE",
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{ apenasContasAtivas: "N" }],
        }),
      });
      const dreData = await dreResponse.json();

      if (dreData.faultstring) {
        console.error("ListarCadastroDRE API error:", dreData.faultstring);
      } else {
        const dreLista: any[] = dreData.dreLista || [];
        // Filter leaf accounts (nivelDRE === 3)
        const contasFolha = dreLista.filter((item: any) => item.nivelDRE === 3);
        console.log(`DRE catalog: ${dreLista.length} total items, ${contasFolha.length} leaf accounts`);

        let dreUpdated = 0;
        for (const conta of contasFolha) {
          if (!conta.codigoDRE || !conta.descricaoDRE) continue;
          const { error: updErr } = await supabase
            .from('omie_categoria_mapeamento')
            .update({ descricao_omie: conta.descricaoDRE })
            .eq('codigo_omie', conta.codigoDRE);
          if (!updErr) dreUpdated++;
        }
        console.log(`DRE catalog: updated ${dreUpdated} category descriptions`);
      }
    } catch (dreError) {
      console.error("ListarCadastroDRE failed (continuing sync):", dreError);
    }

    // Sync Contas a Receber
    if (tipo === 'CONTAS_RECEBER' || tipo === 'TODOS') {
      console.log("Starting AR sync...");
      let pagina = 1;
      let totalPaginas = 1;

      while (pagina <= totalPaginas) {
        const omiePayload = {
          call: 'ListarContasReceber',
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{
            pagina,
            registros_por_pagina: 500,
            apenas_importado_api: "N",
          }],
        };

        console.log(`Fetching AR page ${pagina}...`);
        const response = await fetch(OMIE_FINANCAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(omiePayload),
        });

        const data: OmiePaginatedResponse = await response.json();

        if (data.faultstring) {
          errors.push("Erro ao buscar contas a receber");
          console.error("AR API Error:", data.faultstring);
          break;
        }

        totalPaginas = data.total_de_paginas || 1;
        const titulos = data.conta_receber_cadastro || [];

        console.log(`Processing ${titulos.length} AR titles from page ${pagina}/${totalPaginas}`);

        // Accumulate batch
        const arBatch: any[] = [];
        const pendenciasBatchAR: { tipo: string; origem: string; id_omie_titulo: number; referencia_omie_codigo?: number; detalhes: any }[] = [];

        for (const titulo of titulos) {
          totalProcessed++;

          const projetoId = titulo.codigo_projeto ? projetoMap.get(titulo.codigo_projeto) : null;
          const status = mapOmieStatus(titulo.status_titulo);
          
          // Collect categories
          if (titulo.codigo_categoria) categoriasEncontradas.add(titulo.codigo_categoria);
          if (titulo.categorias?.length) {
            for (const cat of titulo.categorias) {
              if (cat.codigo_categoria) categoriasEncontradas.add(cat.codigo_categoria);
            }
          }
          
          let finalStatus = status;
          if (status === 'ABERTO' && titulo.data_vencimento) {
            const vencimento = parseOmieDate(titulo.data_vencimento);
            if (vencimento && new Date(vencimento) < new Date()) {
              finalStatus = 'ATRASADO';
            }
          }

          arBatch.push({
            id_omie_titulo: titulo.codigo_lancamento_omie,
            omie_projeto_codigo: titulo.codigo_projeto || null,
            projeto_id: projetoId || null,
            data_emissao: parseOmieDate(titulo.data_emissao) || parseOmieDate(titulo.data_vencimento),
            vencimento: parseOmieDate(titulo.data_vencimento),
            valor: titulo.valor_documento || titulo.valor_titulo || 0,
            valor_recebido: titulo.baixa_titulo?.nValPago || 0,
            status: finalStatus,
            cliente: titulo.info_adicionais?.cNomeCliente || null,
            cliente_cnpj: titulo.info_adicionais?.cCPFCNPJCliente || null,
            categoria: titulo.codigo_categoria || null,
            numero_documento: titulo.numero_documento || titulo.info_adicionais?.cNumeroNF || null,
            descricao: titulo.observacao || null,
            data_recebimento: titulo.baixa_titulo?.dDtLiquidacao ? parseOmieDate(titulo.baixa_titulo.dDtLiquidacao) : null,
            parcela: titulo.numero_parcela || null,
            sync_id: syncId,
            valor_inss: titulo.valor_inss || 0,
            valor_ir: titulo.valor_ir || 0,
            valor_iss: titulo.valor_iss || 0,
            valor_pis: titulo.valor_pis || 0,
            valor_cofins: titulo.valor_cofins || 0,
            valor_csll: titulo.valor_csll || 0,
            categorias_rateio: titulo.categorias?.length ? JSON.stringify(titulo.categorias) : null,
            codigo_tipo_documento: titulo.codigo_tipo_documento || null,
            id_conta_corrente: titulo.id_conta_corrente || titulo.info_adicionais?.nCodCC || null,
            raw_data: JSON.stringify(titulo),
          });

          // Prepare pendencies
          if (!titulo.codigo_projeto) {
            pendenciasBatchAR.push({
              tipo: 'SEM_PROJETO',
              origem: 'OMIE_AR',
              id_omie_titulo: titulo.codigo_lancamento_omie,
              detalhes: {
                numero_documento: titulo.numero_documento || titulo.info_adicionais?.cNumeroNF || null,
                cliente: titulo.info_adicionais?.cNomeCliente || null,
                valor: titulo.valor_documento || titulo.valor_titulo || 0,
              },
            });
          } else if (!projetoId) {
            pendenciasBatchAR.push({
              tipo: 'PROJETO_INEXISTENTE',
              origem: 'OMIE_AR',
              id_omie_titulo: titulo.codigo_lancamento_omie,
              referencia_omie_codigo: titulo.codigo_projeto,
              detalhes: {
                omie_projeto_codigo: titulo.codigo_projeto,
                numero_documento: titulo.numero_documento || titulo.info_adicionais?.cNumeroNF || null,
                cliente: titulo.info_adicionais?.cNomeCliente || null,
                valor: titulo.valor_documento || titulo.valor_titulo || 0,
              },
            });
          }
        }

        // Batch upsert AR
        if (arBatch.length > 0) {
          const { error: upsertErr } = await upsertInChunks(supabase, 'omie_contas_receber', arBatch, 'id_omie_titulo');
          if (upsertErr) {
            console.error('AR batch upsert error:', upsertErr);
            errors.push(`Erro ao gravar AR batch: ${upsertErr}`);
          } else {
            totalNew += arBatch.length;
          }
        }

        // Batch insert pendencies
        if (pendenciasBatchAR.length > 0) {
          const omieIds = pendenciasBatchAR.map(p => p.id_omie_titulo);
          const { data: arRefs } = await supabase
            .from('omie_contas_receber')
            .select('id, id_omie_titulo')
            .in('id_omie_titulo', omieIds);

          const refMap = new Map<number, string>();
          arRefs?.forEach((r: any) => refMap.set(r.id_omie_titulo, r.id));

          const pendenciasToInsert = pendenciasBatchAR
            .map(p => {
              const refId = refMap.get(p.id_omie_titulo);
              if (!refId) return null;
              return {
                tipo: p.tipo,
                origem: p.origem,
                referencia_id: refId,
                referencia_omie_codigo: p.referencia_omie_codigo || null,
                detalhes: p.detalhes,
              };
            })
            .filter(Boolean);

          if (pendenciasToInsert.length > 0) {
            const { error: pendError } = await supabase
              .from('pendencias_financeiras')
              .insert(pendenciasToInsert);
            if (!pendError) pendenciasCreated += pendenciasToInsert.length;
          }
        }

        pagina++;
        
        // Small delay to avoid rate limiting
        if (pagina <= totalPaginas) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    // Sync Contas a Pagar
    if (tipo === 'CONTAS_PAGAR' || tipo === 'TODOS') {
      console.log("Starting AP sync...");
      let pagina = 1;
      let totalPaginas = 1;

      while (pagina <= totalPaginas) {
        const omiePayload = {
          call: 'ListarContasPagar',
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{
            pagina,
            registros_por_pagina: 500,
            apenas_importado_api: "N",
          }],
        };

        console.log(`Fetching AP page ${pagina}...`);
        const response = await fetch(OMIE_CONTAS_PAGAR_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(omiePayload),
        });

        const data: OmiePaginatedResponse = await response.json();

        if (data.faultstring) {
          errors.push("Erro ao buscar contas a pagar");
          console.error("AP API Error:", data.faultstring);
          break;
        }

        totalPaginas = data.total_de_paginas || 1;
        const titulos = data.conta_pagar_cadastro || [];

        console.log(`Processing ${titulos.length} AP titles from page ${pagina}/${totalPaginas}`);

        // Accumulate batch
        const apBatch: any[] = [];
        const pendenciasBatchAP: { tipo: string; origem: string; id_omie_titulo: number; referencia_omie_codigo?: number; detalhes: any }[] = [];

        for (const titulo of titulos) {
          totalProcessed++;

          const projetoId = titulo.codigo_projeto ? projetoMap.get(titulo.codigo_projeto) : null;
          const status = mapOmieStatus(titulo.status_titulo);
          
          // Collect categories
          if (titulo.codigo_categoria) categoriasEncontradas.add(titulo.codigo_categoria);
          if (titulo.categorias?.length) {
            for (const cat of titulo.categorias) {
              if (cat.codigo_categoria) categoriasEncontradas.add(cat.codigo_categoria);
            }
          }

          let finalStatus = status;
          if (status === 'ABERTO' && titulo.data_vencimento) {
            const vencimento = parseOmieDate(titulo.data_vencimento);
            if (vencimento && new Date(vencimento) < new Date()) {
              finalStatus = 'ATRASADO';
            }
          }

          apBatch.push({
            id_omie_titulo: titulo.codigo_lancamento_omie,
            omie_projeto_codigo: titulo.codigo_projeto || null,
            projeto_id: projetoId || null,
            data_emissao: parseOmieDate(titulo.data_emissao) || parseOmieDate(titulo.data_vencimento),
            vencimento: parseOmieDate(titulo.data_vencimento),
            valor: titulo.valor_documento || 0,
            valor_pago: titulo.baixa_titulo?.nValPago || 0,
            status: finalStatus,
            fornecedor: titulo.info_adicionais?.cNomeFornecedor || null,
            fornecedor_cnpj: titulo.info_adicionais?.cCPFCNPJFornecedor || null,
            categoria: titulo.codigo_categoria || null,
            numero_documento: titulo.numero_documento || titulo.info_adicionais?.cNumeroNF || null,
            descricao: titulo.observacao || null,
            data_pagamento: titulo.baixa_titulo?.dDtLiquidacao ? parseOmieDate(titulo.baixa_titulo.dDtLiquidacao) : null,
            parcela: titulo.numero_parcela || null,
            sync_id: syncId,
            valor_inss: titulo.valor_inss || 0,
            valor_ir: titulo.valor_ir || 0,
            valor_iss: titulo.valor_iss || 0,
            valor_pis: titulo.valor_pis || 0,
            valor_cofins: titulo.valor_cofins || 0,
            valor_csll: titulo.valor_csll || 0,
            categorias_rateio: titulo.categorias?.length ? JSON.stringify(titulo.categorias) : null,
            codigo_tipo_documento: titulo.codigo_tipo_documento || null,
            id_conta_corrente: titulo.id_conta_corrente || titulo.info_adicionais?.nCodCC || null,
            raw_data: JSON.stringify(titulo),
          });

          // Prepare pendencies
          if (!titulo.codigo_projeto) {
            pendenciasBatchAP.push({
              tipo: 'SEM_PROJETO',
              origem: 'OMIE_AP',
              id_omie_titulo: titulo.codigo_lancamento_omie,
              detalhes: {
                numero_documento: titulo.numero_documento || titulo.info_adicionais?.cNumeroNF || null,
                fornecedor: titulo.info_adicionais?.cNomeFornecedor || null,
                valor: titulo.valor_documento || 0,
              },
            });
          } else if (!projetoId) {
            pendenciasBatchAP.push({
              tipo: 'PROJETO_INEXISTENTE',
              origem: 'OMIE_AP',
              id_omie_titulo: titulo.codigo_lancamento_omie,
              referencia_omie_codigo: titulo.codigo_projeto,
              detalhes: {
                omie_projeto_codigo: titulo.codigo_projeto,
                numero_documento: titulo.numero_documento || titulo.info_adicionais?.cNumeroNF || null,
                fornecedor: titulo.info_adicionais?.cNomeFornecedor || null,
                valor: titulo.valor_documento || 0,
              },
            });
          }
        }

        // Batch upsert AP
        if (apBatch.length > 0) {
          const { error: upsertErr } = await upsertInChunks(supabase, 'omie_contas_pagar', apBatch, 'id_omie_titulo');
          if (upsertErr) {
            console.error('AP batch upsert error:', upsertErr);
            errors.push(`Erro ao gravar AP batch: ${upsertErr}`);
          } else {
            totalNew += apBatch.length;
          }
        }

        // Batch insert pendencies
        if (pendenciasBatchAP.length > 0) {
          const omieIds = pendenciasBatchAP.map(p => p.id_omie_titulo);
          const { data: apRefs } = await supabase
            .from('omie_contas_pagar')
            .select('id, id_omie_titulo')
            .in('id_omie_titulo', omieIds);

          const refMap = new Map<number, string>();
          apRefs?.forEach((r: any) => refMap.set(r.id_omie_titulo, r.id));

          const pendenciasToInsert = pendenciasBatchAP
            .map(p => {
              const refId = refMap.get(p.id_omie_titulo);
              if (!refId) return null;
              return {
                tipo: p.tipo,
                origem: p.origem,
                referencia_id: refId,
                referencia_omie_codigo: p.referencia_omie_codigo || null,
                detalhes: p.detalhes,
              };
            })
            .filter(Boolean);

          if (pendenciasToInsert.length > 0) {
            const { error: pendError } = await supabase
              .from('pendencias_financeiras')
              .insert(pendenciasToInsert);
            if (!pendError) pendenciasCreated += pendenciasToInsert.length;
          }
        }

        pagina++;
        
        if (pagina <= totalPaginas) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    // Batch upsert categories
    if (categoriasEncontradas.size > 0) {
      console.log(`Found ${categoriasEncontradas.size} unique categories, batch upserting...`);
      const catBatch = Array.from(categoriasEncontradas).map(codigo => ({ codigo_omie: codigo }));
      await supabase
        .from('omie_categoria_mapeamento')
        .upsert(catBatch, { onConflict: 'codigo_omie', ignoreDuplicates: true });
    }

    // Update sync log
    const finalStatus = errors.length > 0 ? (totalProcessed > 0 ? 'PARCIAL' : 'ERRO') : 'SUCESSO';
    
    if (syncId) {
      await supabase
        .from('omie_sync_log')
        .update({
          status: finalStatus,
          registros_processados: totalProcessed,
          registros_novos: totalNew,
          registros_atualizados: totalUpdated,
          pendencias_criadas: pendenciasCreated,
          erro_mensagem: errors.length > 0 ? errors.join('; ') : null,
          finalizado_em: new Date().toISOString(),
        })
        .eq('id', syncId);
    }

    console.log(`Sync completed: ${totalProcessed} processed, ${totalNew} new, ${totalUpdated} updated, ${pendenciasCreated} pendencies`);

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Sincronização ${finalStatus.toLowerCase()}`,
        data: {
          registros_processados: totalProcessed,
          registros_novos: totalNew,
          registros_atualizados: totalUpdated,
          pendencias_criadas: pendenciasCreated,
          errors: errors.length > 0 ? errors : undefined,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in omie-financeiro function:", error);
    return new Response(
      JSON.stringify({ ok: false, error: sanitizeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
