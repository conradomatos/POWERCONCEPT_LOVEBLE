import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/collaborators" element={<Collaborators />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/import" element={<ImportCSV />} />
            <Route path="/import-apontamentos" element={<ImportApontamentos />} />
            <Route path="/apontamentos" element={<ApontamentosConsolidado />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/collaborators/:id/costs" element={<CollaboratorCosts />} />
            <Route path="/collaborators/:id/defaults" element={<CollaboratorDefaults />} />
            <Route path="/planejamento" element={<Planejamento />} />
            <Route path="/custos-projeto" element={<CustosProjeto />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
