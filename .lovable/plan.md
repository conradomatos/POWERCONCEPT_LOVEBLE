
# Plano: Reestruturacao da Navegacao - Home + Dashboard Simplificado

## Resumo Executivo

Este plano reorganiza a experiencia do usuario criando uma tela Home focada em acoes rapidas do dia-a-dia, e simplifica o Dashboard para analise gerencial. A navegacao sera ajustada para que `/home` seja o ponto de entrada apos login.

---

## Parte 1: Nova Tela Home

### Objetivo
Criar uma tela de entrada focada no usuario operacional, com acesso rapido as tarefas mais frequentes.

### Estrutura Visual

```text
+----------------------------------+
| Bom dia, Conrado!                |
| Sexta-feira, 31 de Janeiro       |
+----------------------------------+
|                                  |
| [===== APONTAR HORAS =======]    |
| Registrar trabalho de hoje       |
|                                  |
+----------------------------------+
| [Meus Projetos] [Planejamento]   |
| [Apontamentos ] [Dashboard   ]   |
+----------------------------------+
| (se houver pendencias)           |
| ⚠️ 3 pendencias requerem atencao |
+----------------------------------+
```

### Alteracoes no Arquivo: `src/pages/Home.tsx`

A tela Home existente sera completamente reescrita com o novo layout:

1. **Saudacao Personalizada**
   - Funcao para determinar "Bom dia/tarde/noite" baseado na hora atual
   - Buscar nome do usuario via `profiles` ou `user_metadata`
   - Data atual formatada por extenso em portugues

2. **Botao de Acao Principal**
   - Card com `bg-primary` ocupando largura total
   - Icone de relogio + texto "Apontar Horas"
   - Subtitulo: "Registrar trabalho de hoje"
   - Navegacao para `/apontamento-diario`

3. **Atalhos Rapidos (Grid 2x2)**
   - Meus Projetos -> `/projetos`
   - Planejamento -> `/planejamento`
   - Apontamentos -> `/apontamentos`
   - Dashboard -> `/dashboard`

4. **Resumo de Pendencias (Condicional)**
   - Query simplificada para contar pendencias criticas
   - Mostrar apenas se `totalPendencias > 0`
   - Card com borda amarela e link para Dashboard

5. **Responsividade**
   - Mobile: `max-w-full`, cards empilhados
   - Desktop: `max-w-xl mx-auto` para centralizar conteudo

---

## Parte 2: Dashboard Simplificado

### Objetivo
Transformar o Dashboard em uma tela de analise gerencial, removendo acoes operacionais e focando em KPIs financeiros e projetos.

### Estrutura Visual

```text
+------------------------------------------+
| Dashboard                  [Mes v] [↻]   |
+------------------------------------------+
| ⚠️ Alertas (somente se houver)           |
+------------------------------------------+
| [Receita] [Custo] [Lucro] [Margem %]     |
+------------------------------------------+
| PROJETOS                                 |
| Projeto      | Horas    | Custo | Margem |
| OS779 - Nome | 89/100 h | R$32k | 🟢 18% |
+------------------------------------------+
| 📋 Acoes Pendentes                       |
+------------------------------------------+
```

### Alteracoes no Arquivo: `src/pages/Dashboard.tsx`

1. **Remover** importacao e uso de `EquipeCard`
2. **Adicionar** nova secao de KPIs financeiros em linha horizontal
3. **Modificar** `ProjetosCard` para exibir tabela simplificada

### Novo Componente: `src/components/dashboard/FinancialKPIs.tsx`

```text
Props:
  - receita: number
  - custo: number
  - lucro: number (receita - custo)
  - margemPct: number

Layout: Grid com 4 cards em linha
  - Card 1: Receita Total (verde)
  - Card 2: Custo Total (cinza)
  - Card 3: Lucro (verde se positivo, vermelho se negativo)
  - Card 4: Margem % (cores: verde >15%, amarelo 5-15%, vermelho <5%)
```

### Alteracoes no Componente: `src/components/dashboard/ProjetosCard.tsx`

1. **Remover** coluna "Cliente" separada
2. **Simplificar** colunas para: Projeto (OS+Nome), Horas, Custo, Margem
3. **Adicionar** indicador de cor na Margem (emoji ou icone)

### Alteracoes no Componente: `src/components/dashboard/AlertBanner.tsx`

1. **Condicional**: `if (alertas.length === 0) return null`
2. Esconder completamente a secao se nao houver alertas

---

## Parte 3: Ajustes de Navegacao

### Arquivo: `src/App.tsx`

```typescript
// ANTES
<Route path="/" element={<Navigate to="/dashboard" replace />} />

// DEPOIS
<Route path="/" element={<Navigate to="/home" replace />} />
<Route path="/home" element={<Home />} />
```

### Arquivo: `src/pages/Auth.tsx`

```typescript
// ANTES (linha 32 e 62)
navigate('/');

// DEPOIS - manter igual, pois "/" ja redireciona para /home
```

### Arquivo: `src/components/Layout.tsx`

```typescript
// Adicionar mapeamento de rota
const routeToArea: Record<string, NavigationArea> = {
  '/': 'home',
  '/home': 'home',  // NOVO
  // ... resto
};

// Atualizar firstRoutes
const firstRoutes: Record<NavigationArea, string> = {
  home: '/home',  // ATUALIZAR
  // ...
};
```

### Arquivo: `src/components/AppSidebar.tsx`

```typescript
// Adicionar item Home no areaNavItems
home: {
  label: 'Home',
  items: [
    { title: 'Home', url: '/home', icon: Home },
  ],
},
```

### Arquivo: `src/components/Layout.tsx` (Header)

Adicionar icone Home no topNavAreas (opcional, para facilitar navegacao):

```typescript
const topNavAreas = [
  { id: 'home' as NavigationArea, label: 'Home', icon: Home },  // NOVO
  { id: 'recursos' as NavigationArea, label: 'Recursos', icon: Users },
  // ...
];
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/pages/Home.tsx` | Reescrever | Nova tela Home com layout simplificado |
| `src/components/dashboard/FinancialKPIs.tsx` | Criar | Componente para KPIs financeiros em linha |
| `src/pages/Dashboard.tsx` | Modificar | Remover EquipeCard, adicionar FinancialKPIs |
| `src/components/dashboard/ProjetosCard.tsx` | Modificar | Simplificar tabela de projetos |
| `src/components/dashboard/AlertBanner.tsx` | Modificar | Ocultar se vazio |
| `src/App.tsx` | Modificar | Ajustar rota padrao e adicionar /home |
| `src/components/Layout.tsx` | Modificar | Mapear /home e ajustar navegacao |
| `src/components/AppSidebar.tsx` | Modificar | Adicionar item Home na sidebar |

---

## Dependencias e Imports Necessarios

```typescript
// Para Home.tsx
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, FolderKanban, GanttChart, ClipboardList, LayoutDashboard, AlertTriangle } from 'lucide-react';

// Para FinancialKPIs.tsx
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
```

---

## Detalhes Tecnicos

### Funcao de Saudacao (Home.tsx)

```typescript
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDateExtended(): string {
  return format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
}
```

### Query de Pendencias (Home.tsx)

Reutilizar parte da logica de `useDashboardData` para contar pendencias totais:

```typescript
const { data: pendencias } = useQuery({
  queryKey: ['home-pendencias-count'],
  queryFn: async () => {
    const [apontamentos, semCusto] = await Promise.all([
      supabase.from('apontamentos_consolidado')
        .select('*', { count: 'exact', head: true })
        .eq('status_apontamento', 'NAO_LANCADO'),
      supabase.from('custo_projeto_dia')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'SEM_CUSTO'),
    ]);
    return (apontamentos.count || 0) + (semCusto.count || 0);
  },
});
```

### Calculo de Lucro e Margem (Dashboard)

O hook `useDashboardData` ja fornece:
- `financeiro.valores.faturado` (Receita)
- `financeiro.valores.custoMO` (Custo)
- `financeiro.valores.margemPct` (Margem)

Lucro sera calculado: `faturado - custoMO`

---

## Ordem de Implementacao

1. Criar `FinancialKPIs.tsx`
2. Modificar `AlertBanner.tsx` (ocultar se vazio)
3. Modificar `ProjetosCard.tsx` (simplificar tabela)
4. Modificar `Dashboard.tsx` (remover EquipeCard, adicionar KPIs)
5. Reescrever `Home.tsx` (novo layout)
6. Modificar `App.tsx` (rotas)
7. Modificar `Layout.tsx` (navegacao)
8. Modificar `AppSidebar.tsx` (item Home)

---

## Resultado Esperado

- Usuario faz login -> redirecionado para `/home`
- Home mostra saudacao + botao grande para apontar horas
- Atalhos rapidos levam para areas principais
- Dashboard fica focado em analise gerencial
- Card de Equipe removido do Dashboard (movera para Planejamento futuramente)
- KPIs financeiros em destaque no Dashboard
