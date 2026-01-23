import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BudgetData {
  budget: {
    budget_number: string;
    obra_nome: string;
    local?: string;
    cliente: {
      empresa: string;
      razao_social?: string;
      cnpj?: string;
    };
  };
  revision: {
    id: string;
    revision_number: number;
    validade_proposta?: string;
    prazo_execucao_meses?: number;
    premissas?: string;
    exclusoes?: string;
    condicoes_pagamento?: string;
    observacoes?: string;
  };
  summary: {
    total_materiais: number;
    total_mo: number;
    total_equipamentos: number;
    total_engenharia: number;
    total_mobilizacao: number;
    total_canteiro: number;
    subtotal_custo: number;
    markup_pct_aplicado: number;
    valor_markup: number;
    total_impostos: number;
    preco_venda: number;
    margem_pct: number;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function generateProposalHTML(data: BudgetData): string {
  const { budget, revision, summary } = data;
  const today = new Date().toLocaleDateString('pt-BR');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposta Comercial - ${budget.budget_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .doc-info {
      text-align: right;
    }
    .doc-number {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #1e40af;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
      margin-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .info-value {
      font-weight: 500;
    }
    .price-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .price-table th,
    .price-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .price-table th {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
    }
    .price-table .value {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .price-table .subtotal {
      background: #f9fafb;
      font-weight: 500;
    }
    .price-table .total {
      background: #2563eb;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }
    .price-table .total td {
      border-bottom: none;
    }
    .conditions {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
    }
    .conditions h4 {
      font-size: 12px;
      margin-bottom: 8px;
      color: #374151;
    }
    .conditions p {
      white-space: pre-line;
      font-size: 11px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 10px;
      color: #6b7280;
    }
    .signature-area {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 60px;
    }
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 5px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CONCEPT</div>
      <div class="doc-info">
        <div class="doc-number">${budget.budget_number}-R${revision.revision_number}</div>
        <div>Data: ${today}</div>
        <div>Validade: ${formatDate(revision.validade_proposta)}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">CLIENTE</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Razão Social</span>
          <span class="info-value">${budget.cliente?.razao_social || budget.cliente?.empresa || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">CNPJ</span>
          <span class="info-value">${budget.cliente?.cnpj || '-'}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">OBJETO</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Obra</span>
          <span class="info-value">${budget.obra_nome}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Local</span>
          <span class="info-value">${budget.local || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Prazo de Execução</span>
          <span class="info-value">${revision.prazo_execucao_meses ? `${revision.prazo_execucao_meses} meses` : '-'}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">RESUMO DE PREÇOS</div>
      <table class="price-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="value">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Materiais e Equipamentos</td>
            <td class="value">${formatCurrency(summary.total_materiais)}</td>
          </tr>
          <tr>
            <td>Mão de Obra</td>
            <td class="value">${formatCurrency(summary.total_mo)}</td>
          </tr>
          <tr>
            <td>Aluguel de Equipamentos</td>
            <td class="value">${formatCurrency(summary.total_equipamentos)}</td>
          </tr>
          <tr>
            <td>Engenharia</td>
            <td class="value">${formatCurrency(summary.total_engenharia)}</td>
          </tr>
          <tr>
            <td>Mobilização / Desmobilização</td>
            <td class="value">${formatCurrency(summary.total_mobilizacao)}</td>
          </tr>
          <tr>
            <td>Manutenção de Canteiro</td>
            <td class="value">${formatCurrency(summary.total_canteiro)}</td>
          </tr>
          <tr class="subtotal">
            <td>Subtotal de Custos</td>
            <td class="value">${formatCurrency(summary.subtotal_custo)}</td>
          </tr>
          <tr>
            <td>Markup (${summary.markup_pct_aplicado.toFixed(1)}%)</td>
            <td class="value">${formatCurrency(summary.valor_markup)}</td>
          </tr>
          <tr>
            <td>Impostos</td>
            <td class="value">${formatCurrency(summary.total_impostos)}</td>
          </tr>
          <tr class="total">
            <td>PREÇO TOTAL DE VENDA</td>
            <td class="value">${formatCurrency(summary.preco_venda)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${revision.premissas ? `
    <div class="section">
      <div class="section-title">PREMISSAS</div>
      <div class="conditions">
        <p>${revision.premissas}</p>
      </div>
    </div>
    ` : ''}

    ${revision.exclusoes ? `
    <div class="section">
      <div class="section-title">EXCLUSÕES</div>
      <div class="conditions">
        <p>${revision.exclusoes}</p>
      </div>
    </div>
    ` : ''}

    ${revision.condicoes_pagamento ? `
    <div class="section">
      <div class="section-title">CONDIÇÕES DE PAGAMENTO</div>
      <div class="conditions">
        <p>${revision.condicoes_pagamento}</p>
      </div>
    </div>
    ` : ''}

    ${revision.observacoes ? `
    <div class="section">
      <div class="section-title">OBSERVAÇÕES</div>
      <div class="conditions">
        <p>${revision.observacoes}</p>
      </div>
    </div>
    ` : ''}

    <div class="signature-area">
      <div class="signature-line">
        <div>CONCEPT ENGENHARIA</div>
        <div style="font-size: 10px; color: #6b7280;">Contratada</div>
      </div>
      <div class="signature-line">
        <div>${budget.cliente?.empresa || 'CLIENTE'}</div>
        <div style="font-size: 10px; color: #6b7280;">Contratante</div>
      </div>
    </div>

    <div class="footer">
      <p>Proposta válida até ${formatDate(revision.validade_proposta)}</p>
      <p>Documento gerado automaticamente em ${today}</p>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { revision_id, return_html } = await req.json();

    if (!revision_id) {
      return new Response(
        JSON.stringify({ error: 'revision_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating PDF for revision:', revision_id);

    // Fetch revision with budget and client data
    const { data: revision, error: revisionError } = await supabase
      .from('budget_revisions')
      .select(`
        *,
        budget:budgets(
          *,
          cliente:empresas(empresa, razao_social, cnpj)
        )
      `)
      .eq('id', revision_id)
      .single();

    if (revisionError || !revision) {
      console.error('Revision error:', revisionError);
      return new Response(
        JSON.stringify({ error: 'Revision not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch summary
    const { data: summary, error: summaryError } = await supabase
      .from('budget_summary')
      .select('*')
      .eq('revision_id', revision_id)
      .single();

    if (summaryError || !summary) {
      console.error('Summary error:', summaryError);
      return new Response(
        JSON.stringify({ error: 'Budget summary not found. Please recalculate the budget first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const budgetData: BudgetData = {
      budget: {
        budget_number: revision.budget.budget_number,
        obra_nome: revision.budget.obra_nome,
        local: revision.budget.local,
        cliente: revision.budget.cliente,
      },
      revision: {
        id: revision.id,
        revision_number: revision.revision_number,
        validade_proposta: revision.validade_proposta,
        prazo_execucao_meses: revision.prazo_execucao_meses,
        premissas: revision.premissas,
        exclusoes: revision.exclusoes,
        condicoes_pagamento: revision.condicoes_pagamento,
        observacoes: revision.observacoes,
      },
      summary: {
        total_materiais: summary.total_materiais,
        total_mo: summary.total_mo,
        total_equipamentos: summary.total_equipamentos,
        total_engenharia: summary.total_engenharia,
        total_mobilizacao: summary.total_mobilizacao,
        total_canteiro: summary.total_canteiro,
        subtotal_custo: summary.subtotal_custo,
        markup_pct_aplicado: summary.markup_pct_aplicado,
        valor_markup: summary.valor_markup,
        total_impostos: summary.total_impostos,
        preco_venda: summary.preco_venda,
        margem_pct: summary.margem_pct,
      },
    };

    const html = generateProposalHTML(budgetData);

    // If client just wants HTML (for preview), return it
    if (return_html) {
      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // For PDF: we'll return HTML that can be printed as PDF client-side
    // Real PDF generation would require a service like Puppeteer, but that's complex in Edge Functions
    // Alternative: return HTML and let client print-to-PDF or use a PDF service
    
    const fileName = `${revision.budget.budget_number}-R${revision.revision_number}.html`;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Create document record
    if (userId) {
      const { error: docError } = await supabase
        .from('budget_documents')
        .insert({
          revision_id,
          tipo: 'PROPOSTA',
          nome_arquivo: fileName,
          storage_path: `proposals/${fileName}`,
          created_by: userId,
        });

      if (docError) {
        console.error('Document record error:', docError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        fileName,
        message: 'HTML generated. Use browser print function to save as PDF.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
