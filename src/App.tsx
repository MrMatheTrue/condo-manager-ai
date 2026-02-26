import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CondominioDetails from "./pages/CondominioDetails";
import Obrigacoes from "./pages/Obrigacoes";
import Documentos from "./pages/Documentos";
import CheckIn from "./pages/CheckIn";
import Equipe from "./pages/Equipe";
import Configuracoes from "./pages/Configuracoes";
import Onboarding from "./pages/Onboarding";
import IAChat from "./pages/IAChat";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import SelecionarCondominio from "./pages/SelecionarCondominio";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/selecionar-condominio" element={<SelecionarCondominio />} />
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Síndico-only routes */}
              <Route path="/onboarding" element={<ProtectedRoute requiredRole="sindico"><Onboarding /></ProtectedRoute>} />
              <Route path="/condominios/:id" element={<ProtectedRoute requiredRole="sindico"><CondominioDetails /></ProtectedRoute>} />
              <Route path="/condominios/:id/documentos" element={<ProtectedRoute requiredRole="sindico"><Documentos /></ProtectedRoute>} />
              <Route path="/condominios/:id/equipe" element={<ProtectedRoute requiredRole="sindico"><Equipe /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute requiredRole="sindico"><Configuracoes /></ProtectedRoute>} />
              <Route path="/ia" element={<ProtectedRoute requiredRole="sindico"><IAChat /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requiredRole="sindico"><AdminDashboard /></ProtectedRoute>} />

              {/* Shared or specific access routes */}
              <Route path="/condominios/:id/obrigacoes" element={<Obrigacoes />} />
              <Route path="/condominios/:id/checkin" element={<CheckIn />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
