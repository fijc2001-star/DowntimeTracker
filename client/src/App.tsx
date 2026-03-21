import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useCurrentUser } from "@/lib/queries";
import { Loader2 } from "lucide-react";

// Pages
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import ProcessesPage from "@/pages/processes";
import ProcessView from "@/pages/process-view";
import NodeView from "@/pages/node-view";
import AdminPage from "@/pages/admin";
import HelpPage from "@/pages/help";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
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
        <ProtectedRoute component={AdminPage} />
      </Route>
      
      <Route path="/processes">
        <ProtectedRoute component={ProcessesPage} />
      </Route>

      <Route path="/help">
        <ProtectedRoute component={HelpPage} />
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
