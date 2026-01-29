
## Plano: Corrigir Criação de Usuários e Atribuição de Roles

### Diagnóstico do Problema

| Etapa | O que acontece | Por que falha |
|-------|---------------|---------------|
| 1. Admin clica "Criar Usuário" | `supabase.auth.signUp()` é chamado | ✅ Funciona |
| 2. Usuário é criado | Novo user_id é gerado, profile é criado | ✅ Funciona |
| 3. **Login automático ocorre** | `auth.uid()` passa a ser o novo usuário | ⚠️ Efeito colateral |
| 4. Inserção de roles | `INSERT INTO user_roles` é bloqueado por RLS | ❌ FALHA |
| 5. Listagem na tela Admin | Filtra `users.filter(u => u.roles.length > 0)` | ❌ Não aparece |

### Solução

Criar uma **Edge Function** que usa a **Service Role Key** para:
1. Criar o usuário via Admin API (não faz login automático)
2. Inserir os roles diretamente (bypassa RLS)
3. Vincular ao colaborador

Isso é necessário porque operações administrativas precisam de privilégios elevados que o cliente não pode ter.

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/create-user/index.ts` | **CRIAR** - Edge function para criação segura |
| `src/components/admin/AddUserDialog.tsx` | **MODIFICAR** - Chamar a edge function |

### Detalhes Técnicos

#### 1. Edge Function: `create-user/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar se o chamador é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Cliente com token do usuário para verificar permissões
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user: callerUser } } = await userClient.auth.getUser()
    if (!callerUser) throw new Error('Unauthorized')

    // Verificar se é admin
    const { data: callerRoles } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
    
    const isAdmin = callerRoles?.some(r => 
      r.role === 'admin' || r.role === 'super_admin'
    )
    if (!isAdmin) throw new Error('Apenas administradores podem criar usuários')

    // Dados do novo usuário
    const { email, password, fullName, roles, collaboratorId } = await req.json()

    // Cliente admin para operações privilegiadas
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Criar usuário via Admin API (não faz login)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (createError) throw createError
    const userId = newUser.user.id

    // 2. Inserir roles
    for (const role of roles) {
      await adminClient.from('user_roles').insert({ user_id: userId, role })
    }

    // 3. Vincular colaborador
    if (collaboratorId) {
      await adminClient
        .from('collaborators')
        .update({ user_id: userId })
        .eq('id', collaboratorId)
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

#### 2. Modificar `AddUserDialog.tsx`

```typescript
// Substituir supabase.auth.signUp por chamada à edge function
const handleSubmit = async () => {
  // ... validações existentes ...

  setIsSubmitting(true);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName: colaboradores?.find(c => c.id === selectedColaborador)?.full_name || '',
          roles: selectedRoles,
          collaboratorId: selectedColaborador,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      if (result.error?.includes('already registered') || result.error?.includes('already been registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(result.error || 'Erro ao criar usuário');
      }
      return;
    }

    toast.success('Usuário criado com sucesso');
    onSuccess();
    onOpenChange(false);
  } catch (error) {
    console.error('Error creating user:', error);
    toast.error('Erro ao criar usuário');
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 3. Arquivo CORS compartilhado (se não existir)

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Fluxo Corrigido

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Admin clica    │────▶│  Edge Function   │────▶│  Supabase       │
│  "Criar Usuário"│     │  (Service Role)  │     │  Admin API      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │ 1. Verifica se   │
                        │    chamador é    │
                        │    admin         │
                        └────────┬─────────┘
                                 │
                              ▼
                        ┌──────────────────┐
                        │ 2. Cria usuário  │
                        │    (Admin API)   │
                        └────────┬─────────┘
                                 │
                              ▼
                        ┌──────────────────┐
                        │ 3. Insere roles  │
                        │    (bypass RLS)  │
                        └────────┬─────────┘
                                 │
                              ▼
                        ┌──────────────────┐
                        │ 4. Vincula       │
                        │    colaborador   │
                        └──────────────────┘
```

### Vantagens da Solução

1. **Segurança**: A service role key fica apenas no servidor (edge function)
2. **Sem login automático**: Admin permanece logado após criar usuário
3. **Operação atômica**: Tudo acontece na mesma chamada
4. **Auditoria**: Verificamos permissões do chamador antes de executar
5. **Usuário já confirmado**: `email_confirm: true` evita email de confirmação

### Alternativa Considerada (Descartada)

Poderíamos criar uma policy de INSERT que permitisse admins inserirem roles para outros usuários. Porém, o problema do login automático do `signUp()` ainda causaria o admin perder sua sessão, então a edge function é a solução correta.
