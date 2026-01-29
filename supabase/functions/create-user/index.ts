import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar se o chamador é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Cliente com token do usuário para verificar permissões
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user: callerUser } } = await userClient.auth.getUser()
    if (!callerUser) {
      throw new Error('Unauthorized')
    }

    // Verificar se é admin
    const { data: callerRoles } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
    
    const isAdmin = callerRoles?.some(r => 
      r.role === 'admin' || r.role === 'super_admin'
    )
    if (!isAdmin) {
      throw new Error('Apenas administradores podem criar usuários')
    }

    // Dados do novo usuário
    const { email, password, fullName, roles, collaboratorId } = await req.json()

    // Validações básicas
    if (!email || !password || !roles || roles.length === 0) {
      throw new Error('Dados incompletos: email, senha e papéis são obrigatórios')
    }

    // Verificar se SUPER_ADMIN só pode ser atribuído por SUPER_ADMIN
    const isSuperAdmin = callerRoles?.some(r => r.role === 'super_admin')
    if (roles.includes('super_admin') && !isSuperAdmin) {
      throw new Error('Apenas Super Admins podem criar outros Super Admins')
    }

    // Cliente admin para operações privilegiadas
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Criar usuário via Admin API (não faz login)
    console.log(`Creating user with email: ${email}`)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }

    if (!newUser?.user) {
      throw new Error('Falha ao criar usuário')
    }

    const userId = newUser.user.id
    console.log(`User created with ID: ${userId}`)

    // 2. Inserir roles
    for (const role of roles) {
      console.log(`Inserting role ${role} for user ${userId}`)
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert({ user_id: userId, role })
      
      if (roleError) {
        console.error(`Error inserting role ${role}:`, roleError)
        // Continue with other roles even if one fails
      }
    }

    // 3. Vincular colaborador
    if (collaboratorId) {
      console.log(`Linking collaborator ${collaboratorId} to user ${userId}`)
      const { error: linkError } = await adminClient
        .from('collaborators')
        .update({ user_id: userId })
        .eq('id', collaboratorId)
      
      if (linkError) {
        console.error('Error linking collaborator:', linkError)
        // User is created, just log the error
      }
    }

    console.log('User creation completed successfully')
    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in create-user function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
