import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Settings,
  Users,
  FolderKanban,
  BarChart3,
  PanelLeft,
} from 'lucide-react';
import logoConceptImg from '@/assets/logo-concept.png';
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export type NavigationArea = 'recursos' | 'projetos' | 'relatorios' | 'home';

interface LayoutProps {
  children: ReactNode;
}

// Map routes to their navigation area
const routeToArea: Record<string, NavigationArea> = {
  // Home
  '/': 'home',
  // Recursos
  '/collaborators': 'recursos',
  '/recursos/custos': 'recursos',
  '/import': 'recursos',
  // Projetos
  '/empresas': 'projetos',
  '/projetos': 'projetos',
  '/planejamento': 'projetos',
  '/apontamentos': 'projetos',
  '/import-apontamentos': 'projetos',
  // Relatórios
  '/dashboard': 'relatorios',
  '/custos-projeto': 'relatorios',
};

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, roles, hasRole } = useAuth();
  
  // Determine active area based on current route
  const getAreaFromPath = (path: string): NavigationArea => {
    // Check exact match first
    if (routeToArea[path]) return routeToArea[path];
    // Check if path starts with any known route
    for (const [route, area] of Object.entries(routeToArea)) {
      if (path.startsWith(route) && route !== '/') return area;
    }
    return 'relatorios'; // Default
  };
  
  const [activeArea, setActiveArea] = useState<NavigationArea>(() => 
    getAreaFromPath(location.pathname)
  );

  // Update active area when route changes
  useEffect(() => {
    const area = getAreaFromPath(location.pathname);
    setActiveArea(area);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAreaClick = (area: NavigationArea) => {
    setActiveArea(area);
    // Navigate to first route of each area
    const firstRoutes: Record<NavigationArea, string> = {
      home: '/',
      recursos: '/collaborators',
      projetos: '/projetos',
      relatorios: '/dashboard',
    };
    navigate(firstRoutes[area]);
  };

  // Top navigation areas
  const topNavAreas = [
    { id: 'recursos' as NavigationArea, label: 'Recursos', icon: Users },
    { id: 'projetos' as NavigationArea, label: 'Projetos', icon: FolderKanban },
    { id: 'relatorios' as NavigationArea, label: 'Relatórios', icon: BarChart3 },
  ];

  const canAccessSettings = hasRole('admin') || hasRole('super_admin');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeArea={activeArea} />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header className="border-b border-border bg-card sticky top-0 z-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex h-14 items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="-ml-1">
                    <PanelLeft className="h-5 w-5" />
                  </SidebarTrigger>
                  
                  {/* Logo - clickable to home */}
                  <Link 
                    to="/" 
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <img src={logoConceptImg} alt="PwC" className="h-8 w-auto" />
                  </Link>
                  
                  {/* Top Nav - 3 Areas */}
                  <nav className="hidden md:flex items-center gap-1 ml-4">
                    {topNavAreas.map((area) => {
                      const Icon = area.icon;
                      return (
                        <Button
                          key={area.id}
                          variant={activeArea === area.id ? 'default' : 'ghost'}
                          size="sm"
                          className={cn(
                            'gap-2 text-sm font-medium',
                            activeArea === area.id && 'bg-primary text-primary-foreground'
                          )}
                          onClick={() => handleAreaClick(area.id)}
                        >
                          <Icon className="h-4 w-4" />
                          {area.label}
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
                  
                  {/* Settings Icon */}
                  {canAccessSettings && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate('/admin')}
                      className={cn(
                        location.pathname === '/admin' && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Mobile Nav - 3 Areas */}
          <nav className="md:hidden border-b border-border bg-card px-4 py-2 flex gap-1 overflow-x-auto">
            {topNavAreas.map((area) => {
              const Icon = area.icon;
              return (
                <Button
                  key={area.id}
                  variant={activeArea === area.id ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 flex-shrink-0 text-xs',
                    activeArea === area.id && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => handleAreaClick(area.id)}
                >
                  <Icon className="h-4 w-4" />
                  {area.label}
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
