import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  LogOut,
  Shield,
  Building2,
  FolderKanban,
  CalendarDays,
  ClipboardList,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

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

  // Strategic navigation items (top bar only)
  const topNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/empresas', label: 'Empresas', icon: Building2 },
    { path: '/projetos', label: 'Projetos', icon: FolderKanban },
    { path: '/planejamento', label: 'Planejamento', icon: CalendarDays },
    { path: '/apontamentos', label: 'Apontamentos', icon: ClipboardList },
  ];

  if (hasRole('admin')) {
    topNavItems.push({ path: '/admin', label: 'Administração', icon: Shield });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header className="border-b border-border bg-card sticky top-0 z-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex h-14 items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="-ml-1">
                    <PanelLeft className="h-5 w-5" />
                  </SidebarTrigger>
                  <h1 className="text-lg font-semibold tracking-tight hidden sm:block">PowerConcept</h1>
                  <nav className="hidden lg:flex items-center gap-1 ml-4">
                    {topNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.path}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'gap-2 text-sm',
                            location.pathname === item.path && 'bg-accent text-accent-foreground'
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
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[180px]">
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

          {/* Mobile Nav (strategic items) */}
          <nav className="lg:hidden border-b border-border bg-card px-4 py-2 flex gap-1 overflow-x-auto">
            {topNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'gap-2 flex-shrink-0 text-xs',
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
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
