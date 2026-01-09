import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  LayoutDashboard, 
  LogOut,
  Upload,
  Shield,
  Building2,
  FolderKanban,
  CalendarDays,
  Clock,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, roles, hasRole } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/collaborators', label: 'Colaboradores', icon: Users },
    { path: '/empresas', label: 'Empresas', icon: Building2 },
    { path: '/projetos', label: 'Projetos', icon: FolderKanban },
    { path: '/planejamento', label: 'Planejamento', icon: CalendarDays },
    { path: '/apontamentos', label: 'Apontamentos', icon: ClipboardList, roles: ['admin', 'rh'] as const },
    { path: '/import', label: 'Importar Colaboradores', icon: Upload, roles: ['admin', 'rh'] as const },
    { path: '/import-apontamentos', label: 'Importar Apontamentos', icon: Clock, roles: ['admin', 'rh'] as const },
  ];

  if (hasRole('admin')) {
    navItems.push({ path: '/admin', label: 'Administração', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-semibold tracking-tight">PowerConcept</h1>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  if (item.roles && !item.roles.some((r) => hasRole(r))) {
                    return null;
                  }
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'gap-2',
                        location.pathname === item.path && 'bg-accent'
                      )}
                      onClick={() => navigate(item.path)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
              {roles.length > 0 && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  {roles[0].toUpperCase()}
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden border-b border-border bg-card px-4 py-2 flex gap-1 overflow-x-auto">
        {navItems.map((item) => {
          if (item.roles && !item.roles.some((r) => hasRole(r))) {
            return null;
          }
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 flex-shrink-0',
                location.pathname === item.path && 'bg-accent'
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
