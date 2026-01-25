import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useAppStore } from "@/lib/store";

// Pages
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import ProcessView from "@/pages/process-view";
import NodeView from "@/pages/node-view";
import AdminPage from "@/pages/admin";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { currentUser } = useAppStore();

  if (!currentUser) {
    return <Redirect to="/auth" />;
  }

  if (adminOnly && currentUser.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/process/:id">
        <ProtectedRoute component={ProcessView} />
      </Route>
      
      <Route path="/node/:id">
        <ProtectedRoute component={NodeView} />
      </Route>
      
      <Route path="/admin">
        <ProtectedRoute component={AdminPage} adminOnly />
      </Route>
      
      <Route path="/processes">
         <Redirect to="/" /> {/* Simplified for now, just redirect to dashboard as it lists processes */}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
