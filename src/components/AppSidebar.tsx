import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  ClipboardList,
  Upload,
  FileSpreadsheet,
  Users,
  Building2,
  FolderKanban,
  Settings,
  GanttChart,
  DollarSign,
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

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('admin' | 'rh' | 'financeiro' | 'super_admin')[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Operação',
    items: [
      { title: 'Apontamentos', url: '/apontamentos', icon: ClipboardList },
      { title: 'Importar Apontamentos', url: '/import-apontamentos', icon: Upload, roles: ['admin', 'rh'] },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { title: 'Planejamento', url: '/planejamento', icon: GanttChart },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Custos de Projetos', url: '/custos-projeto', icon: DollarSign },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { title: 'Colaboradores', url: '/collaborators', icon: Users },
      { title: 'Importar Colaboradores', url: '/import', icon: FileSpreadsheet, roles: ['admin', 'rh'] },
      { title: 'Empresas', url: '/empresas', icon: Building2 },
      { title: 'Projetos', url: '/projetos', icon: FolderKanban },
    ],
  },
  {
    label: 'Admin',
    items: [
      { title: 'Configurações', url: '/admin', icon: Settings, roles: ['admin'] },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { hasRole } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.some((r) => hasRole(r))
          );

          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
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
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
