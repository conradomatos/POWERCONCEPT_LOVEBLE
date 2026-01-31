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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

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

        for (const titulo of titulos) {
          totalProcessed++;

          const projetoId = titulo.codigo_projeto ? projetoMap.get(titulo.codigo_projeto) : null;
          const status = mapOmieStatus(titulo.status_titulo);
          
          // Check if status should be ATRASADO based on date
          let finalStatus = status;
          if (status === 'ABERTO' && titulo.data_vencimento) {
            const vencimento = parseOmieDate(titulo.data_vencimento);
            if (vencimento && new Date(vencimento) < new Date()) {
              finalStatus = 'ATRASADO';
            }
          }

          const arRecord = {
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
          };

          // Upsert AR record
          const { data: existingAR } = await supabase
            .from('omie_contas_receber')
            .select('id')
            .eq('id_omie_titulo', titulo.codigo_lancamento_omie)
            .single();

          if (existingAR) {
            await supabase
              .from('omie_contas_receber')
              .update(arRecord)
              .eq('id_omie_titulo', titulo.codigo_lancamento_omie);
            totalUpdated++;
          } else {
            const { data: newAR } = await supabase
              .from('omie_contas_receber')
              .insert(arRecord)
              .select()
              .single();
            totalNew++;

            // Create pendency if needed
            if (newAR) {
              if (!titulo.codigo_projeto) {
                await supabase.from('pendencias_financeiras').insert({
                  tipo: 'SEM_PROJETO',
                  origem: 'OMIE_AR',
                  referencia_id: newAR.id,
                  detalhes: { 
                    numero_documento: arRecord.numero_documento,
                    cliente: arRecord.cliente,
                    valor: arRecord.valor 
                  },
                });
                pendenciasCreated++;
              } else if (!projetoId) {
                await supabase.from('pendencias_financeiras').insert({
                  tipo: 'PROJETO_INEXISTENTE',
                  origem: 'OMIE_AR',
                  referencia_id: newAR.id,
                  referencia_omie_codigo: titulo.codigo_projeto,
                  detalhes: { 
                    omie_projeto_codigo: titulo.codigo_projeto,
                    numero_documento: arRecord.numero_documento,
                    cliente: arRecord.cliente,
                    valor: arRecord.valor 
                  },
                });
                pendenciasCreated++;
              }
            }
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

        for (const titulo of titulos) {
          totalProcessed++;

          const projetoId = titulo.codigo_projeto ? projetoMap.get(titulo.codigo_projeto) : null;
          const status = mapOmieStatus(titulo.status_titulo);
          
          let finalStatus = status;
          if (status === 'ABERTO' && titulo.data_vencimento) {
            const vencimento = parseOmieDate(titulo.data_vencimento);
            if (vencimento && new Date(vencimento) < new Date()) {
              finalStatus = 'ATRASADO';
            }
          }

          const apRecord = {
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
          };

          const { data: existingAP } = await supabase
            .from('omie_contas_pagar')
            .select('id')
            .eq('id_omie_titulo', titulo.codigo_lancamento_omie)
            .single();

          if (existingAP) {
            await supabase
              .from('omie_contas_pagar')
              .update(apRecord)
              .eq('id_omie_titulo', titulo.codigo_lancamento_omie);
            totalUpdated++;
          } else {
            const { data: newAP } = await supabase
              .from('omie_contas_pagar')
              .insert(apRecord)
              .select()
              .single();
            totalNew++;

            if (newAP) {
              if (!titulo.codigo_projeto) {
                await supabase.from('pendencias_financeiras').insert({
                  tipo: 'SEM_PROJETO',
                  origem: 'OMIE_AP',
                  referencia_id: newAP.id,
                  detalhes: { 
                    numero_documento: apRecord.numero_documento,
                    fornecedor: apRecord.fornecedor,
                    valor: apRecord.valor 
                  },
                });
                pendenciasCreated++;
              } else if (!projetoId) {
                await supabase.from('pendencias_financeiras').insert({
                  tipo: 'PROJETO_INEXISTENTE',
                  origem: 'OMIE_AP',
                  referencia_id: newAP.id,
                  referencia_omie_codigo: titulo.codigo_projeto,
                  detalhes: { 
                    omie_projeto_codigo: titulo.codigo_projeto,
                    numero_documento: apRecord.numero_documento,
                    fornecedor: apRecord.fornecedor,
                    valor: apRecord.valor 
                  },
                });
                pendenciasCreated++;
              }
            }
          }
        }

        pagina++;
        
        if (pagina <= totalPaginas) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
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
