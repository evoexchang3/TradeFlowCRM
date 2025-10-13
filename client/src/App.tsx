import { Switch, Route } from "wouter";
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
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import ClientForm from "@/pages/client-form";
import Trading from "@/pages/trading";
import Transactions from "@/pages/transactions";
import Roles from "@/pages/roles";
import Teams from "@/pages/teams";
import ImportData from "@/pages/import-data";
import ExportData from "@/pages/export-data";
import AuditLogs from "@/pages/audit-logs";
import Register from "@/pages/register";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/new" component={ClientForm} />
      <Route path="/clients/:id" component={ClientDetail} />
      <Route path="/clients/:id/edit" component={ClientForm} />
      <Route path="/trading" component={Trading} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/roles" component={Roles} />
      <Route path="/teams" component={Teams} />
      <Route path="/import" component={ImportData} />
      <Route path="/export" component={ExportData} />
      <Route path="/audit" component={AuditLogs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
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
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
