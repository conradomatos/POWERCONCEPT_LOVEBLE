import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Trash2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading, hasRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AppRole>('rh');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && user && !hasRole('admin')) {
      navigate('/');
    }
  }, [user, loading, navigate, hasRole]);

  const fetchUsers = async () => {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoadingUsers(false);
      return;
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    // Combine data
    const usersData: UserWithRole[] = (profiles || []).map((profile) => ({
      id: profile.user_id,
      email: profile.email || '',
      full_name: profile.full_name,
      roles: (roles || [])
        .filter((r) => r.user_id === profile.user_id)
        .map((r) => r.role),
    }));

    setUsers(usersData);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (user && hasRole('admin')) {
      fetchUsers();
    }
  }, [user, hasRole]);

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Usuário já possui esse papel');
      } else {
        toast.error('Erro ao adicionar papel');
      }
      return;
    }

    toast.success('Papel adicionado!');
    fetchUsers();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      toast.error('Erro ao remover papel');
      return;
    }

    toast.success('Papel removido!');
    fetchUsers();
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'rh':
        return 'secondary';
      case 'financeiro':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!hasRole('admin')) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Administração</h2>
          <p className="text-muted-foreground">Gerencie usuários e permissões</p>
        </div>

        {/* Roles Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Níveis de Acesso</CardTitle>
            <CardDescription>Cada papel define o que o usuário pode fazer no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default">ADMIN</Badge>
                <span>Acesso total: gerencia usuários, colaboradores e configurações</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">RH</Badge>
                <span>Cadastra e edita colaboradores, importa dados</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">FINANCEIRO</Badge>
                <span>Visualiza colaboradores e relatórios (somente leitura)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
            <CardDescription>
              {users.length} usuário{users.length !== 1 && 's'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum usuário cadastrado</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Papéis</TableHead>
                      <TableHead className="text-right">Adicionar Papel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.full_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <span className="text-muted-foreground text-sm">Sem acesso</span>
                            ) : (
                              u.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant={getRoleBadgeVariant(role)}
                                  className="gap-1 cursor-pointer"
                                  onClick={() => {
                                    if (u.id !== user?.id) {
                                      removeRole(u.id, role);
                                    }
                                  }}
                                >
                                  {role.toUpperCase()}
                                  {u.id !== user?.id && <Trash2 className="h-3 w-3" />}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {u.id !== user?.id && (
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                value={selectedRole}
                                onValueChange={(v: AppRole) => setSelectedRole(v)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="rh">RH</SelectItem>
                                  <SelectItem value="financeiro">Financeiro</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => addRole(u.id, selectedRole)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
