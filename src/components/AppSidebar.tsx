import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Users,
  FileSpreadsheet,
  Building2,
  FolderKanban,
  GanttChart,
  ClipboardList,
  Upload,
  LayoutDashboard,
  DollarSign,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import type { NavigationArea } from './Layout';

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('admin' | 'rh' | 'financeiro' | 'super_admin')[];
};

type AreaConfig = {
  label: string;
  items: NavItem[];
};

// Sidebar items organized by area
const areaNavItems: Record<NavigationArea, AreaConfig> = {
  home: {
    label: 'Home',
    items: [],
  },
  recursos: {
    label: 'Recursos',
    items: [
      { title: 'Colaboradores', url: '/collaborators', icon: Users },
      { title: 'Custos de Pessoal', url: '/recursos/custos', icon: DollarSign, roles: ['admin', 'rh', 'financeiro', 'super_admin'] },
      { title: 'Importar Colaboradores', url: '/import', icon: FileSpreadsheet, roles: ['admin', 'rh'] },
    ],
  },
  projetos: {
    label: 'Projetos',
    items: [
      { title: 'Clientes', url: '/empresas', icon: Building2 },
      { title: 'Projetos', url: '/projetos', icon: FolderKanban },
      { title: 'Aprovações', url: '/aprovacoes-projetos', icon: FileCheck, roles: ['admin'] },
      { title: 'Planejamento', url: '/planejamento', icon: GanttChart },
      { title: 'Apontamentos', url: '/apontamentos', icon: ClipboardList },
      { title: 'Importar Apontamentos', url: '/import-apontamentos', icon: Upload, roles: ['admin', 'rh'] },
    ],
  },
  relatorios: {
    label: 'Relatórios',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Rentabilidade', url: '/rentabilidade', icon: DollarSign },
      { title: 'Custos & Margem', url: '/custos-projeto', icon: DollarSign },
      { title: 'Pendências', url: '/pendencias', icon: AlertTriangle },
    ],
  },
};

interface AppSidebarProps {
  activeArea: NavigationArea;
}

export function AppSidebar({ activeArea }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { hasRole } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const currentAreaConfig = areaNavItems[activeArea];
  
  // Filter items based on user roles
  const visibleItems = currentAreaConfig.items.filter(
    (item) => !item.roles || item.roles.some((r) => hasRole(r))
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel>{currentAreaConfig.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
