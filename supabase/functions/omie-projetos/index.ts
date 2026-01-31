import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OMIE_API_URL = "https://app.omie.com.br/api/v1/geral/projetos/";

// Valid API call types
const VALID_CALLS = ['ListarProjetos', 'UpsertProjeto', 'ConsultarProjeto'] as const;

interface OmieRequest {
  call: string;
  param: Record<string, unknown>;
  meta?: {
    entity?: string;
    entity_id?: string;
    action?: string;
  };
}

interface OmieResponse {
  codigo?: number;
  descricao?: string;
  faultstring?: string;
  faultcode?: string;
  total_de_paginas?: number;
  cadastro?: Array<{
    codigo: number;
    nome: string;
    codInt?: string;
    inativo?: string;
  }>;
  [key: string]: unknown;
}

// Input validation helpers
function isValidCall(call: string): boolean {
  return VALID_CALLS.includes(call as typeof VALID_CALLS[number]);
}

function isValidString(value: unknown, maxLength: number = 500): boolean {
  return typeof value === 'string' && value.length <= maxLength;
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
  return 'Erro ao processar requisição';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OMIE_APP_KEY = Deno.env.get('OMIE_APP_KEY');
    const OMIE_APP_SECRET = Deno.env.get('OMIE_APP_SECRET');

    if (!OMIE_APP_KEY || !OMIE_APP_SECRET) {
      console.error("Missing Omie credentials");
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Credenciais do Omie não configuradas" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse and validate request body
    let body: OmieRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Dados de requisição inválidos" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Received request:", JSON.stringify({ call: body.call, meta: body.meta }, null, 2));

    // Validate call field
    if (!body.call || !isValidCall(body.call)) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Tipo de operação inválido" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle ListarProjetos - sync all projects from Omie to local cache
    if (body.call === 'ListarProjetos') {
      console.log("Starting ListarProjetos sync...");
      
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      let pagina = 1;
      let totalPaginas = 1;
      const todosOsProjetos: Array<{ codigo: number; nome: string; codInt?: string; inativo?: string }> = [];

      // Paginated fetch from Omie
      while (pagina <= totalPaginas) {
        console.log(`Fetching page ${pagina} of ${totalPaginas}...`);
        
        const omiePayload = {
          call: 'ListarProjetos',
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{ 
            pagina, 
            registros_por_pagina: 500, 
            apenas_importado_api: "N" 
          }]
        };

        const omieResponse = await fetch(OMIE_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(omiePayload),
        });

        const omieData: OmieResponse = await omieResponse.json();
        
        if (omieData.faultstring) {
          console.error("Omie API error:", omieData.faultstring);
          return new Response(
            JSON.stringify({ 
              ok: false, 
              error: "Erro ao buscar projetos do Omie"
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        totalPaginas = omieData.total_de_paginas || 1;
        
        if (omieData.cadastro && Array.isArray(omieData.cadastro)) {
          todosOsProjetos.push(...omieData.cadastro);
          console.log(`Page ${pagina}: fetched ${omieData.cadastro.length} projects`);
        }
        
        pagina++;
      }

      console.log(`Total projects fetched: ${todosOsProjetos.length}`);

      // Upsert all projects to omie_projetos table
      let upsertedCount = 0;
      for (const projeto of todosOsProjetos) {
        const { error } = await supabaseClient
          .from('omie_projetos')
          .upsert({
            codigo: projeto.codigo,
            nome: projeto.nome,
            cod_int: projeto.codInt || null,
            inativo: projeto.inativo === 'S',
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'codigo',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`Error upserting project ${projeto.codigo}:`, error);
        } else {
          upsertedCount++;
        }
      }

      console.log(`Successfully upserted ${upsertedCount} projects`);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          total: todosOsProjetos.length,
          upserted: upsertedCount,
          message: `${upsertedCount} projetos sincronizados do Omie`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate UpsertProjeto specific fields
    if (body.call === 'UpsertProjeto') {
      const param = body.param as { codInt?: string; nome?: string; inativo?: string };
      
      if (!param?.codInt || !isValidString(param.codInt, 50)) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: "Código interno inválido" 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!param?.nome || !isValidString(param.nome, 200)) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: "Nome do projeto inválido" 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate inativo field if present
      if (param.inativo !== undefined && !['S', 'N'].includes(param.inativo)) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: "Status inativo inválido" 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Build Omie API request for other calls
    const omiePayload = {
      call: body.call,
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [body.param],
    };

    console.log("Calling Omie API:", OMIE_API_URL);

    // Call Omie API
    const omieResponse = await fetch(OMIE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(omiePayload),
    });

    const omieData: OmieResponse = await omieResponse.json();
    console.log("Omie response received");

    // Check for Omie errors
    if (omieData.faultstring || omieData.faultcode) {
      console.error("Omie API error:", omieData.faultstring);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Erro na operação com Omie",
          data: { descricao: omieData.descricao }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({ 
        ok: true, 
        data: omieData,
        message: omieData.descricao || "Projeto sincronizado com sucesso"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error in omie-projetos function:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: sanitizeErrorMessage(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
