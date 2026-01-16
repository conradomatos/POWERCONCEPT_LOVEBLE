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
import { UserPlus, Trash2, UserCheck, Clock, Users, Shield, AlertCircle } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading, hasRole, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRole>>({});

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
      .select('user_id, full_name, email, created_at')
      .order('created_at', { ascending: false });

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
      created_at: profile.created_at,
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

    toast.success('Papel atribuído com sucesso!');
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

  const approveUser = async (userId: string) => {
    const role = selectedRoles[userId] || 'rh';
    await addRole(userId, role);
  };

  const getRoleBadgeVariant = (role: AppRole): "default" | "secondary" | "outline" | "destructive" => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
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

  const getRoleLabel = (role: AppRole): string => {
    const labels: Record<AppRole, string> = {
      'super_admin': 'SUPER ADMIN',
      'admin': 'ADMIN',
      'rh': 'RH',
      'financeiro': 'FINANCEIRO',
    };
    return labels[role] || String(role).toUpperCase();
  };

  // Separate pending and approved users
  const pendingUsers = users.filter(u => u.roles.length === 0);
  const approvedUsers = users.filter(u => u.roles.length > 0);

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
          <h2 className="text-2xl font-semibold tracking-tight">Administração de Usuários</h2>
          <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card className={pendingUsers.length > 0 ? 'border-amber-500/50 bg-amber-500/5' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes de Aprovação</CardTitle>
              <Clock className={`h-4 w-4 ${pendingUsers.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${pendingUsers.length > 0 ? 'text-amber-500' : ''}`}>
                {pendingUsers.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedUsers.length}</div>
            </CardContent>
          </Card>
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
                <Badge variant="destructive">SUPER ADMIN</Badge>
                <span>Acesso máximo: pode alterar OS de projetos e todas as configurações críticas</span>
              </div>
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

        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <Card className="border-amber-500/50">
            <CardHeader className="bg-amber-500/10">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg text-amber-600 dark:text-amber-400">
                  Usuários Pendentes de Aprovação
                </CardTitle>
              </div>
              <CardDescription>
                {pendingUsers.length} usuário{pendingUsers.length !== 1 && 's'} aguardando aprovação
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Solicitado em</TableHead>
                      <TableHead>Atribuir Papel</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((u) => (
                      <TableRow key={u.id} className="bg-amber-500/5">
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.full_name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(u.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={selectedRoles[u.id] || 'rh'}
                            onValueChange={(v: AppRole) => 
                              setSelectedRoles(prev => ({ ...prev, [u.id]: v }))
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {isSuperAdmin() && (
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              )}
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="rh">RH</SelectItem>
                              <SelectItem value="financeiro">Financeiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => approveUser(u.id)}
                            className="gap-2"
                          >
                            <UserCheck className="h-4 w-4" />
                            Aprovar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuários Ativos</CardTitle>
            <CardDescription>
              {approvedUsers.length} usuário{approvedUsers.length !== 1 && 's'} com acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : approvedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário ativo no sistema
              </div>
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
                    {approvedUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.full_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={getRoleBadgeVariant(role)}
                                className="gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  if (u.id !== user?.id) {
                                    removeRole(u.id, role);
                                  }
                                }}
                                title={u.id === user?.id ? 'Você não pode remover seu próprio papel' : 'Clique para remover'}
                              >
                                {getRoleLabel(role)}
                                {u.id !== user?.id && <Trash2 className="h-3 w-3" />}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {u.id !== user?.id && (
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                value={selectedRoles[u.id] || 'rh'}
                                onValueChange={(v: AppRole) => 
                                  setSelectedRoles(prev => ({ ...prev, [u.id]: v }))
                                }
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {isSuperAdmin() && (
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                  )}
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="rh">RH</SelectItem>
                                  <SelectItem value="financeiro">Financeiro</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => addRole(u.id, selectedRoles[u.id] || 'rh')}
                                title="Adicionar papel"
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
