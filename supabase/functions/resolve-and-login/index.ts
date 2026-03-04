import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Rate limit simples em memória (por IP, 5 tentativas/minuto)
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

// Limpar entries expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts) {
    if (now > entry.resetAt) attempts.delete(ip);
  }
}, 60_000);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // Rate limit por IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde 1 minuto.' }),
        { status: 429, headers: jsonHeaders }
      );
    }

    // Parse body
    let body: { identifier?: string; pin?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const { identifier, pin } = body;

    // Validações básicas (resposta genérica sempre)
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: jsonHeaders }
      );
    }
    if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let email: string | null = null;
    const cleaned = identifier.trim().toLowerCase();

    if (cleaned.includes('@')) {
      // É email direto
      email = cleaned;
    } else if (/^\d{11}$/.test(cleaned.replace(/\D/g, ''))) {
      // Parece CPF (11 dígitos)
      const cpfClean = cleaned.replace(/\D/g, '');
      const { data: collab } = await adminClient
        .from('collaborators')
        .select('user_id')
        .eq('cpf', cpfClean)
        .not('user_id', 'is', null)
        .maybeSingle();

      if (collab?.user_id) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(collab.user_id);
        email = authUser?.user?.email || null;
      }
    } else {
      // Tentar como username
      const { data: profile } = await adminClient
        .from('profiles')
        .select('user_id')
        .eq('username', cleaned)
        .maybeSingle();

      if (profile?.user_id) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(profile.user_id);
        email = authUser?.user?.email || null;
      }
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // Autenticar via GoTrue REST API
    const goTrueUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
    const authResponse = await fetch(goTrueUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ email, password: pin }),
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const tokens = await authResponse.json();

    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }),
      { headers: jsonHeaders }
    );
  } catch (error) {
    console.error('resolve-and-login error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
