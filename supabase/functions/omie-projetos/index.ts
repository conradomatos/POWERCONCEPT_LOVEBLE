import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OMIE_API_URL = "https://app.omie.com.br/api/v1/geral/projetos/";

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

    const body: OmieRequest = await req.json();
    console.log("Received request:", JSON.stringify(body, null, 2));

    // Validate required fields based on call type
    if (!body.call) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Campo obrigatório ausente: call" 
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
              error: omieData.faultstring,
              faultcode: omieData.faultcode
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
      const param = body.param as { codInt?: string; nome?: string };
      if (!param?.codInt || !param?.nome) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: "Campos obrigatórios ausentes para UpsertProjeto: codInt ou nome" 
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
    console.log("Payload (without secrets):", JSON.stringify({
      call: body.call,
      param: [body.param],
    }, null, 2));

    // Call Omie API
    const omieResponse = await fetch(OMIE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(omiePayload),
    });

    const omieData: OmieResponse = await omieResponse.json();
    console.log("Omie response:", JSON.stringify(omieData, null, 2));

    // Check for Omie errors
    if (omieData.faultstring || omieData.faultcode) {
      console.error("Omie API error:", omieData.faultstring);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: omieData.faultstring || "Erro desconhecido do Omie",
          faultcode: omieData.faultcode,
          data: omieData
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
    const errorMessage = error instanceof Error ? error.message : "Erro interno ao processar requisição";
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
