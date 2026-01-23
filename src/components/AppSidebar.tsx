import { useLocation, useParams } from 'react-router-dom';
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
  Calculator,
  Package,
  Layers,
  HardHat,
  Truck,
  Wrench,
  Cog,
  PencilRuler,
  BarChart2,
  CalendarClock,
  FileText,
  Eye,
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
  orcamentos: {
    label: 'Orçamentos',
    items: [
      { title: 'Lista de Orçamentos', url: '/orcamentos', icon: Calculator },
    ],
  },
};

// Budget detail contextual navigation
const budgetDetailNavItems: NavItem[] = [
  { title: 'Visão Geral', url: '', icon: Eye },
  { title: 'Parâmetros', url: '/parametros', icon: Cog },
  { title: 'Estrutura WBS', url: '/estrutura', icon: Layers },
  { title: 'Materiais', url: '/materiais', icon: Package },
  { title: 'Mão de Obra', url: '/mao-de-obra', icon: HardHat },
  { title: 'Mobilização', url: '/mobilizacao', icon: Truck },
  { title: 'Canteiro', url: '/canteiro', icon: Wrench },
  { title: 'Equipamentos', url: '/equipamentos', icon: PencilRuler },
  { title: 'Engenharia', url: '/engenharia', icon: PencilRuler },
  { title: 'Histograma', url: '/histograma', icon: BarChart2 },
  { title: 'Cronograma', url: '/cronograma', icon: CalendarClock },
  { title: 'Resumo', url: '/resumo', icon: DollarSign },
  { title: 'Documentos', url: '/documentos', icon: FileText },
];

interface AppSidebarProps {
  activeArea: NavigationArea;
}

export function AppSidebar({ activeArea }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const params = useParams();
  const { hasRole } = useAuth();

  // Check if we're in a budget detail page
  const budgetId = params.id;
  const isBudgetDetail = activeArea === 'orcamentos' && budgetId && location.pathname.startsWith(`/orcamentos/${budgetId}`);

  const isActive = (path: string) => {
    if (isBudgetDetail) {
      const fullPath = `/orcamentos/${budgetId}${path}`;
      // For the index route (Visão Geral), check exact match
      if (path === '') {
        return location.pathname === `/orcamentos/${budgetId}`;
      }
      return location.pathname === fullPath;
    }
    return location.pathname === path;
  };

  // Get navigation items based on context
  let navLabel: string;
  let visibleItems: NavItem[];

  if (isBudgetDetail) {
    navLabel = 'Seções do Orçamento';
    visibleItems = budgetDetailNavItems;
  } else {
    const currentAreaConfig = areaNavItems[activeArea];
    navLabel = currentAreaConfig.label;
    visibleItems = currentAreaConfig.items.filter(
      (item) => !item.roles || item.roles.some((r) => hasRole(r))
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel>{navLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const itemUrl = isBudgetDetail 
                  ? `/orcamentos/${budgetId}${item.url}` 
                  : item.url;
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(isBudgetDetail ? item.url : itemUrl)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={itemUrl}
                        className="flex items-center gap-2"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
