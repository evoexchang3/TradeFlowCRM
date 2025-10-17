import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { AuthProvider } from "@/lib/auth";
import { RouteGuard } from "@/components/route-guard";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import CRMDashboard from "@/pages/crm-dashboard";
import TeamDashboard from "@/pages/team-dashboard";
import AgentDashboard from "@/pages/agent-dashboard";
import SalesManagerDashboard from "@/pages/sales-manager-dashboard";
import RetentionManagerDashboard from "@/pages/retention-manager-dashboard";
import Clients from "@/pages/clients";
import SalesClients from "@/pages/sales";
import RetentionClients from "@/pages/retention";
import ClientDetail from "@/pages/client-detail";
import ClientForm from "@/pages/client-form";
import Trading from "@/pages/trading";
import GlobalOpenPositions from "@/pages/global-open-positions";
import GlobalClosedPositions from "@/pages/global-closed-positions";
import SalesDashboard from "@/pages/sales-dashboard";
import RetentionDashboard from "@/pages/retention-dashboard";
import ActivityFeed from "@/pages/activity-feed";
import TradingSymbols from "@/pages/trading-symbols";
import TradingSymbolGroups from "@/pages/trading-symbol-groups";
import CFDAccounts from "@/pages/cfd-accounts";
import Transactions from "@/pages/transactions";
import Calendar from "@/pages/calendar";
import Chat from "@/pages/chat";
import EmailTemplates from "@/pages/email-templates";
import Affiliates from "@/pages/affiliates";
import AffiliateDashboard from "@/pages/affiliate-dashboard";
import CustomStatuses from "@/pages/custom-statuses";
import Hierarchy from "@/pages/hierarchy";
import KYCQuestions from "@/pages/kyc-questions";
import TemplateVariables from "@/pages/template-variables";
import SecuritySettings from "@/pages/security-settings";
import SmtpSettings from "@/pages/smtp-settings";
import PaymentProviders from "@/pages/payment-providers";
import TeamRouting from "@/pages/team-routing";
import SmartAssignmentSettings from "@/pages/smart-assignment-settings";
import Roles from "@/pages/roles";
import Teams from "@/pages/teams";
import TeamDetail from "@/pages/team-detail";
import ApiKeys from "@/pages/api-keys";
import ImportData from "@/pages/import-data";
import ExportData from "@/pages/export-data";
import AuditLogs from "@/pages/audit-logs";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import UserManagement from "@/pages/user-management";
import GlobalSearch from "@/pages/global-search";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/register">
        <RouteGuard requireAuth={false}>
          <Register />
        </RouteGuard>
      </Route>
      <Route path="/login">
        <RouteGuard requireAuth={false}>
          <Login />
        </RouteGuard>
      </Route>
      <Route path="/">
        <RouteGuard requireAuth={false}>
          <Landing />
        </RouteGuard>
      </Route>

      {/* Role-specific dashboards */}
      <Route path="/admin">
        <RouteGuard allowedRoles={['Administrator']}>
          <AdminDashboard />
        </RouteGuard>
      </Route>
      <Route path="/crm">
        <RouteGuard allowedRoles={['CRM Manager']}>
          <CRMDashboard />
        </RouteGuard>
      </Route>
      <Route path="/team">
        <RouteGuard allowedRoles={['Team Leader']}>
          <TeamDashboard />
        </RouteGuard>
      </Route>
      <Route path="/agent">
        <RouteGuard allowedRoles={['Agent']}>
          <AgentDashboard />
        </RouteGuard>
      </Route>
      <Route path="/dashboard/sales-manager">
        <RouteGuard allowedRoles={['CRM Manager', 'Administrator']}>
          <SalesManagerDashboard />
        </RouteGuard>
      </Route>
      <Route path="/dashboard/retention-manager">
        <RouteGuard allowedRoles={['CRM Manager', 'Administrator']}>
          <RetentionManagerDashboard />
        </RouteGuard>
      </Route>

      {/* Generic dashboard (fallback) */}
      <Route path="/dashboard">
        <RouteGuard>
          <Dashboard />
        </RouteGuard>
      </Route>

      {/* Client management - all staff roles */}
      <Route path="/clients/sales">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <SalesClients />
        </RouteGuard>
      </Route>
      <Route path="/clients/retention">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <RetentionClients />
        </RouteGuard>
      </Route>
      <Route path="/clients">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <Clients />
        </RouteGuard>
      </Route>
      <Route path="/clients/new">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <ClientForm />
        </RouteGuard>
      </Route>
      <Route path="/clients/:id">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <ClientDetail />
        </RouteGuard>
      </Route>
      <Route path="/clients/:id/edit">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <ClientForm />
        </RouteGuard>
      </Route>
      <Route path="/search/global">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <GlobalSearch />
        </RouteGuard>
      </Route>

      {/* Trading - all staff roles */}
      <Route path="/trading/symbols">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <TradingSymbols />
        </RouteGuard>
      </Route>
      <Route path="/trading/symbol-groups">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <TradingSymbolGroups />
        </RouteGuard>
      </Route>
      <Route path="/trading/cfd-accounts">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader']}>
          <CFDAccounts />
        </RouteGuard>
      </Route>
      <Route path="/trading/open-positions">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <GlobalOpenPositions />
        </RouteGuard>
      </Route>
      <Route path="/trading/closed-positions">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <GlobalClosedPositions />
        </RouteGuard>
      </Route>
      <Route path="/trading">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <Trading />
        </RouteGuard>
      </Route>

      {/* Transactions - all staff roles */}
      <Route path="/transactions">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <Transactions />
        </RouteGuard>
      </Route>

      {/* Calendar - all staff roles */}
      <Route path="/calendar">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <Calendar />
        </RouteGuard>
      </Route>

      <Route path="/chat">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader', 'Agent']}>
          <Chat />
        </RouteGuard>
      </Route>

      {/* User Management - admin only */}
      <Route path="/users">
        <RouteGuard allowedRoles={['Administrator']}>
          <UserManagement />
        </RouteGuard>
      </Route>

      {/* Roles - admin only */}
      <Route path="/roles">
        <RouteGuard allowedRoles={['Administrator']}>
          <Roles />
        </RouteGuard>
      </Route>

      {/* Teams - admin, CRM manager, team leader */}
      <Route path="/teams/:id">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader']}>
          <TeamDetail />
        </RouteGuard>
      </Route>
      <Route path="/teams">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader']}>
          <Teams />
        </RouteGuard>
      </Route>

      {/* API Keys - admin only */}
      <Route path="/api-keys">
        <RouteGuard allowedRoles={['Administrator']}>
          <ApiKeys />
        </RouteGuard>
      </Route>

      {/* Import/Export - admin, CRM manager */}
      <Route path="/import">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <ImportData />
        </RouteGuard>
      </Route>
      <Route path="/export">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <ExportData />
        </RouteGuard>
      </Route>

      {/* Audit Logs - admin, CRM manager */}
      <Route path="/audit">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <AuditLogs />
        </RouteGuard>
      </Route>

      {/* Email Templates - admin, CRM manager */}
      <Route path="/configuration/email-templates">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <EmailTemplates />
        </RouteGuard>
      </Route>

      <Route path="/configuration/affiliates">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <Affiliates />
        </RouteGuard>
      </Route>

      <Route path="/configuration/custom-statuses">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <CustomStatuses />
        </RouteGuard>
      </Route>

      <Route path="/configuration/hierarchy">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <Hierarchy />
        </RouteGuard>
      </Route>

      <Route path="/configuration/kyc-questions">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <KYCQuestions />
        </RouteGuard>
      </Route>

      <Route path="/configuration/template-variables">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <TemplateVariables />
        </RouteGuard>
      </Route>

      <Route path="/configuration/security-settings">
        <RouteGuard allowedRoles={['Administrator']}>
          <SecuritySettings />
        </RouteGuard>
      </Route>

      <Route path="/configuration/smtp-settings">
        <RouteGuard allowedRoles={['Administrator']}>
          <SmtpSettings />
        </RouteGuard>
      </Route>

      <Route path="/configuration/payment-providers">
        <RouteGuard allowedRoles={['Administrator']}>
          <PaymentProviders />
        </RouteGuard>
      </Route>

      <Route path="/configuration/team-routing">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <TeamRouting />
        </RouteGuard>
      </Route>

      <Route path="/configuration/smart-assignment">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <SmartAssignmentSettings />
        </RouteGuard>
      </Route>

      {/* Reports */}
      <Route path="/reports/affiliates">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager']}>
          <AffiliateDashboard />
        </RouteGuard>
      </Route>

      <Route path="/reports/sales">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader']}>
          <SalesDashboard />
        </RouteGuard>
      </Route>

      <Route path="/reports/retention">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader']}>
          <RetentionDashboard />
        </RouteGuard>
      </Route>

      <Route path="/activity-feed">
        <RouteGuard allowedRoles={['Administrator', 'CRM Manager', 'Team Leader']}>
          <ActivityFeed />
        </RouteGuard>
      </Route>

      {/* 404 */}
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
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
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
