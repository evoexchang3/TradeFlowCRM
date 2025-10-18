import { 
  LayoutDashboard, 
  Users, 
  UserCheck,
  UserPlus,
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Shield, 
  UsersRound,
  Key,
  FileUp,
  FileDown,
  History,
  Settings,
  LogOut,
  BarChart3,
  Layers,
  FolderOpen,
  Wallet,
  Calendar,
  Mail,
  MessageSquare,
  Network,
  Palette,
  ClipboardList,
  Variable,
  Lock,
  Server,
  CreditCard,
  Share2,
  ArrowRightLeft,
  Settings2,
  Activity,
  Search,
  Trophy,
  FileText
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Role, Team } from "@shared/schema";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface MenuItem {
  titleKey: string; // Translation key instead of hardcoded title
  url: string;
  icon: any;
  roles?: string[]; // If undefined, available to all roles
}

const menuItems: MenuItem[] = [
  {
    titleKey: "nav.dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    titleKey: "nav.sales.clients",
    url: "/clients/sales",
    icon: UserPlus,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.retention.clients",
    url: "/clients/retention",
    icon: UserCheck,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.all.clients",
    url: "/clients",
    icon: Users,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.global.search",
    url: "/search/global",
    icon: Search,
    roles: ['administrator', 'crm manager', 'team leader', 'agent'],
  },
  {
    titleKey: "nav.trading.symbols",
    url: "/trading/symbols",
    icon: Layers,
    roles: ['administrator', 'crm manager'],
  },
  {
    titleKey: "nav.symbol.groups",
    url: "/trading/symbol-groups",
    icon: FolderOpen,
    roles: ['administrator', 'crm manager'],
  },
  {
    titleKey: "nav.cfd.accounts",
    url: "/trading/cfd-accounts",
    icon: Wallet,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.open.positions",
    url: "/trading/open-positions",
    icon: TrendingUp,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.closed.positions",
    url: "/trading/closed-positions",
    icon: TrendingDown,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.trading",
    url: "/trading",
    icon: TrendingUp,
  },
  {
    titleKey: "nav.transactions",
    url: "/transactions",
    icon: DollarSign,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    titleKey: "nav.sales.dashboard",
    url: "/reports/sales",
    icon: BarChart3,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.retention.dashboard",
    url: "/reports/retention",
    icon: TrendingUp,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.activity.feed",
    url: "/activity-feed",
    icon: Activity,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.affiliates",
    url: "/affiliates",
    icon: Share2,
    roles: ['administrator', 'crm manager'],
  },
  {
    titleKey: "nav.chat",
    url: "/chat",
    icon: MessageSquare,
  },
  {
    titleKey: "nav.leaderboard",
    url: "/leaderboard",
    icon: Trophy,
  },
];

const managementItems: MenuItem[] = [
  {
    titleKey: "nav.user.management",
    url: "/users",
    icon: Users,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.roles.permissions",
    url: "/roles",
    icon: Shield,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.teams",
    url: "/teams",
    icon: UsersRound,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    titleKey: "nav.api.keys",
    url: "/api-keys",
    icon: Key,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.import.data",
    url: "/import",
    icon: FileUp,
    roles: ['administrator', 'crm manager'],
  },
  {
    titleKey: "nav.export.data",
    url: "/export",
    icon: FileDown,
    roles: ['administrator', 'crm manager'],
  },
  {
    titleKey: "nav.audit.logs",
    url: "/audit",
    icon: History,
    roles: ['administrator', 'crm manager'],
  },
  {
    titleKey: "nav.audit.reports",
    url: "/audit/reports",
    icon: FileText,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.email.templates",
    url: "/configuration/email-templates",
    icon: Mail,
    roles: ['administrator', 'crm manager'],
  },
];

const configurationItems: MenuItem[] = [
  {
    titleKey: "nav.organizational.hierarchy",
    url: "/configuration/hierarchy",
    icon: Network,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.custom.statuses",
    url: "/configuration/custom-statuses",
    icon: Palette,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.team.routing",
    url: "/configuration/team-routing",
    icon: ArrowRightLeft,
    roles: ['administrator', 'crm manager'],
  },
  {
    titleKey: "nav.smart.assignment",
    url: "/configuration/smart-assignment",
    icon: Settings2,
    roles: ['administrator', 'crm manager'],
  },
  {
    titleKey: "nav.kyc.questions",
    url: "/configuration/kyc-questions",
    icon: ClipboardList,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.template.variables",
    url: "/configuration/template-variables",
    icon: Variable,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.security.settings",
    url: "/configuration/security-settings",
    icon: Lock,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.smtp.settings",
    url: "/configuration/smtp-settings",
    icon: Server,
    roles: ['administrator'],
  },
  {
    titleKey: "nav.payment.providers",
    url: "/configuration/payment-providers",
    icon: CreditCard,
    roles: ['administrator'],
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { t } = useLanguage();

  // Fetch user's role to filter menu items
  const { data: role } = useQuery<Role>({
    queryKey: [`/api/roles/${user?.roleId}`],
    enabled: !!user?.roleId,
  });

  // Fetch user's team to determine department
  const { data: team } = useQuery<Team>({
    queryKey: [`/api/teams/${user?.teamId}`],
    enabled: !!user?.teamId,
  });

  const roleName = role?.name?.toLowerCase() || '';
  const department = team?.department;

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  // Filter menu items based on role and department
  const filterByRoleAndDepartment = (item: MenuItem) => {
    // Check role restriction first
    if (item.roles && !item.roles.includes(roleName)) {
      return false; // Role not allowed
    }

    // Department-specific filtering for CRM Managers
    if (roleName === 'crm manager' && department) {
      // Sales CRM Managers only see Sales Clients
      if (item.titleKey === 'nav.sales.clients' && department !== 'sales') {
        return false;
      }
      // Retention CRM Managers only see Retention Clients
      if (item.titleKey === 'nav.retention.clients' && department !== 'retention') {
        return false;
      }
      // If CRM Manager has a specific department, hide the "All Clients" aggregated view
      // They should use their department-specific view
      if (item.titleKey === 'nav.all.clients' && (department === 'sales' || department === 'retention')) {
        return false;
      }
    }

    return true; // All other cases pass through
  };

  const filteredMenuItems = menuItems.filter(filterByRoleAndDepartment);
  const filteredManagementItems = managementItems.filter(filterByRoleAndDepartment);
  const filteredConfigurationItems = configurationItems.filter(filterByRoleAndDepartment);

  // Determine dashboard URL based on role and department
  const getDashboardUrl = () => {
    if (roleName === 'administrator') return '/admin';
    if (roleName === 'agent') return '/dashboard/agent';
    if (roleName === 'team leader') return '/dashboard/team';
    if (roleName === 'crm manager') {
      // CRM Manager dashboard varies by department
      if (department === 'sales') return '/dashboard/sales-manager';
      if (department === 'retention') return '/dashboard/retention-manager';
      return '/dashboard/crm'; // Unified dashboard for other departments or no department
    }
    return '/dashboard';
  };

  const dashboardUrl = getDashboardUrl();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Trading Platform</span>
            <span className="text-xs text-muted-foreground">CRM System</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.main.menu')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard link with role-specific URL */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === dashboardUrl}
                  data-testid="link-dashboard"
                >
                  <Link href={dashboardUrl}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t('nav.dashboard')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {filteredMenuItems.filter(item => item.titleKey !== "nav.dashboard").map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`link-${item.titleKey.split('.')[1]}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.titleKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredManagementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.management')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredManagementItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        data-testid={`link-${item.titleKey.split('.')[1]}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{t(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredConfigurationItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.configuration')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredConfigurationItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        data-testid={`link-${item.titleKey.split('.')[1]}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{t(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
              <span>{t('nav.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
