import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Collaborators from "./pages/Collaborators";
import ImportCSV from "./pages/ImportCSV";
import ImportApontamentos from "./pages/ImportApontamentos";
import ApontamentosConsolidado from "./pages/ApontamentosConsolidado";
import Admin from "./pages/Admin";
import CollaboratorCosts from "./pages/CollaboratorCosts";
import Empresas from "./pages/Empresas";
import Projetos from "./pages/Projetos";
import Planejamento from "./pages/Planejamento";
import CollaboratorDefaults from "./pages/CollaboratorDefaults";
import CustosProjeto from "./pages/CustosProjeto";
import AprovacoesProjetos from "./pages/AprovacoesProjetos";
import CustosPessoal from "./pages/CustosPessoal";
import Rentabilidade from "./pages/Rentabilidade";
import RentabilidadeProjeto from "./pages/RentabilidadeProjeto";
import MapeamentoOmie from "./pages/MapeamentoOmie";
import ReceitasConferencia from "./pages/ReceitasConferencia";
import OrcamentosList from "./pages/orcamentos/OrcamentosList";
import OrcamentoDetail from "./pages/orcamentos/OrcamentoDetail";
import VisaoGeral from "./pages/orcamentos/VisaoGeral";
import Materiais from "./pages/orcamentos/Materiais";
import MaoDeObra from "./pages/orcamentos/MaoDeObra";
import Parametros from "./pages/orcamentos/Parametros";
import Mobilizacao from "./pages/orcamentos/Mobilizacao";
import Canteiro from "./pages/orcamentos/Canteiro";
import Equipamentos from "./pages/orcamentos/Equipamentos";
import Engenharia from "./pages/orcamentos/Engenharia";
import Estrutura from "./pages/orcamentos/Estrutura";
import Histograma from "./pages/orcamentos/Histograma";
import Cronograma from "./pages/orcamentos/Cronograma";
import ResumoPrecos from "./pages/orcamentos/ResumoPrecos";
import Documentos from "./pages/orcamentos/Documentos";
import AlimentacaoIndustrial from "./pages/orcamentos/AlimentacaoIndustrial";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/collaborators" element={<Collaborators />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/import" element={<ImportCSV />} />
            <Route path="/import-apontamentos" element={<ImportApontamentos />} />
            <Route path="/apontamentos" element={<ApontamentosConsolidado />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/aprovacoes-projetos" element={<AprovacoesProjetos />} />
            <Route path="/collaborators/:id/costs" element={<CollaboratorCosts />} />
            <Route path="/collaborators/:id/defaults" element={<CollaboratorDefaults />} />
            <Route path="/planejamento" element={<Planejamento />} />
            <Route path="/custos-projeto" element={<CustosProjeto />} />
            <Route path="/recursos/custos" element={<CustosPessoal />} />
            <Route path="/rentabilidade" element={<Rentabilidade />} />
            <Route path="/rentabilidade/mapeamento" element={<MapeamentoOmie />} />
            <Route path="/rentabilidade/receitas" element={<ReceitasConferencia />} />
            <Route path="/rentabilidade/:id" element={<RentabilidadeProjeto />} />
            <Route path="/orcamentos" element={<OrcamentosList />} />
            <Route path="/orcamentos/:id" element={<OrcamentoDetail />}>
              <Route index element={<VisaoGeral />} />
              <Route path="parametros" element={<Parametros />} />
              <Route path="estrutura" element={<Estrutura />} />
              <Route path="materiais" element={<Materiais />} />
              <Route path="alimentacao-industrial" element={<AlimentacaoIndustrial />} />
              <Route path="mao-de-obra" element={<MaoDeObra />} />
              <Route path="mobilizacao" element={<Mobilizacao />} />
              <Route path="canteiro" element={<Canteiro />} />
              <Route path="equipamentos" element={<Equipamentos />} />
              <Route path="engenharia" element={<Engenharia />} />
              <Route path="histograma" element={<Histograma />} />
              <Route path="cronograma" element={<Cronograma />} />
              <Route path="resumo" element={<ResumoPrecos />} />
              <Route path="documentos" element={<Documentos />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
