import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider } from "@/lib/auth";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import CRMDashboard from "@/pages/crm-dashboard";
import TeamDashboard from "@/pages/team-dashboard";
import AgentDashboard from "@/pages/agent-dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import ClientForm from "@/pages/client-form";
import Trading from "@/pages/trading";
import Transactions from "@/pages/transactions";
import Roles from "@/pages/roles";
import Teams from "@/pages/teams";
import ApiKeys from "@/pages/api-keys";
import ImportData from "@/pages/import-data";
import ExportData from "@/pages/export-data";
import AuditLogs from "@/pages/audit-logs";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/" component={Landing} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/crm" component={CRMDashboard} />
      <Route path="/team" component={TeamDashboard} />
      <Route path="/agent" component={AgentDashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/new" component={ClientForm} />
      <Route path="/clients/:id" component={ClientDetail} />
      <Route path="/clients/:id/edit" component={ClientForm} />
      <Route path="/trading" component={Trading} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/roles" component={Roles} />
      <Route path="/teams" component={Teams} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/import" component={ImportData} />
      <Route path="/export" component={ExportData} />
      <Route path="/audit" component={AuditLogs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const isLandingPage = location === '/';
  const isAuthPage = location === '/login' || location === '/register' || location === '/';

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isAuthPage) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between h-14 px-4 border-b sticky top-0 z-10 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-background">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <AppLayout />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
