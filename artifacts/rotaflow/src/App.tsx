import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import EntregadorHome from "@/pages/entregador-home";
import Entregas from "@/pages/entregas";
import Motoristas from "@/pages/motoristas";
import Relatorios from "@/pages/relatorios";
import Configuracoes from "@/pages/configuracoes";
import Otimizador from "@/pages/otimizador";
import Mapa from "@/pages/mapa";
import HistoricoRotas from "@/pages/historico-rotas";
import Layout from "@/components/layout";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({
  component: Component,
  entregadorComponent,
  adminOnly = false,
  ...rest
}: {
  component: React.ComponentType<any>;
  entregadorComponent?: React.ComponentType<any>;
  adminOnly?: boolean;
  [key: string]: any;
}) {
  const { isAuthenticated, loading, isAdmin, isEntregador } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
    if (!loading && isAuthenticated && adminOnly && isEntregador && !entregadorComponent) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, isAdmin, isEntregador, adminOnly, entregadorComponent, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(210 40% 98%)" }}>
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "hsl(221 83% 53%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (adminOnly && isEntregador && !entregadorComponent) return null;

  const RenderComponent = isEntregador && entregadorComponent ? entregadorComponent : Component;

  return (
    <Layout>
      <RenderComponent {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} entregadorComponent={EntregadorHome} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} entregadorComponent={EntregadorHome} />}
      </Route>
      <Route path="/entregas">
        {() => <ProtectedRoute component={Entregas} adminOnly />}
      </Route>
      <Route path="/motoristas">
        {() => <ProtectedRoute component={Motoristas} adminOnly />}
      </Route>
      <Route path="/otimizador">
        {() => <ProtectedRoute component={Otimizador} />}
      </Route>
      <Route path="/relatorios">
        {() => <ProtectedRoute component={Relatorios} adminOnly />}
      </Route>
      <Route path="/configuracoes">
        {() => <ProtectedRoute component={Configuracoes} adminOnly />}
      </Route>
      <Route path="/mapa">
        {() => <ProtectedRoute component={Mapa} adminOnly />}
      </Route>
      <Route path="/historico-rotas">
        {() => <ProtectedRoute component={HistoricoRotas} adminOnly />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
