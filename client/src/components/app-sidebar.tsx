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
  Search
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
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
  title: string;
  url: string;
  icon: any;
  roles?: string[]; // If undefined, available to all roles
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Sales Clients",
    url: "/clients/sales",
    icon: UserPlus,
    roles: ['administrator', 'crm manager', 'team leader'], // Managers and TLs only
  },
  {
    title: "Retention Clients",
    url: "/clients/retention",
    icon: UserCheck,
    roles: ['administrator', 'crm manager', 'team leader'], // Managers and TLs only
  },
  {
    title: "All Clients",
    url: "/clients",
    icon: Users,
    roles: ['administrator', 'crm manager', 'team leader'], // Managers and TLs only
  },
  {
    title: "Global Search",
    url: "/search/global",
    icon: Search,
    roles: ['administrator', 'crm manager', 'team leader', 'agent'],
  },
  {
    title: "Trading Symbols",
    url: "/trading/symbols",
    icon: Layers,
    roles: ['administrator', 'crm manager'],
  },
  {
    title: "Symbol Groups",
    url: "/trading/symbol-groups",
    icon: FolderOpen,
    roles: ['administrator', 'crm manager'],
  },
  {
    title: "CFD Accounts",
    url: "/trading/cfd-accounts",
    icon: Wallet,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    title: "Open Positions",
    url: "/trading/open-positions",
    icon: TrendingUp,
    roles: ['administrator', 'crm manager', 'team leader'], // Not for agents
  },
  {
    title: "Closed Positions",
    url: "/trading/closed-positions",
    icon: TrendingDown,
    roles: ['administrator', 'crm manager', 'team leader'], // Not for agents
  },
  {
    title: "Trading",
    url: "/trading",
    icon: TrendingUp,
    // Available to all roles including agents
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: DollarSign,
    roles: ['administrator', 'crm manager', 'team leader'], // Not for agents
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
    // Available to all roles including agents
  },
  {
    title: "Sales Dashboard",
    url: "/reports/sales",
    icon: BarChart3,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    title: "Retention Dashboard",
    url: "/reports/retention",
    icon: TrendingUp,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    title: "Activity Feed",
    url: "/activity-feed",
    icon: Activity,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    title: "Affiliates",
    url: "/affiliates",
    icon: Share2,
    roles: ['administrator', 'crm manager'],
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
    // Available to all roles including agents
  },
];

const managementItems: MenuItem[] = [
  {
    title: "User Management",
    url: "/users",
    icon: Users,
    roles: ['administrator'], // Admin only
  },
  {
    title: "Roles & Permissions",
    url: "/roles",
    icon: Shield,
    roles: ['administrator'], // Admin only
  },
  {
    title: "Teams",
    url: "/teams",
    icon: UsersRound,
    roles: ['administrator', 'crm manager', 'team leader'],
  },
  {
    title: "API Keys",
    url: "/api-keys",
    icon: Key,
    roles: ['administrator'], // Admin only
  },
  {
    title: "Import Data",
    url: "/import",
    icon: FileUp,
    roles: ['administrator', 'crm manager'],
  },
  {
    title: "Export Data",
    url: "/export",
    icon: FileDown,
    roles: ['administrator', 'crm manager'],
  },
  {
    title: "Audit Logs",
    url: "/audit",
    icon: History,
    roles: ['administrator', 'crm manager'],
  },
  {
    title: "Email Templates",
    url: "/configuration/email-templates",
    icon: Mail,
    roles: ['administrator', 'crm manager'],
  },
];

const configurationItems: MenuItem[] = [
  {
    title: "Organizational Hierarchy",
    url: "/configuration/hierarchy",
    icon: Network,
    roles: ['administrator'],
  },
  {
    title: "Custom Statuses",
    url: "/configuration/custom-statuses",
    icon: Palette,
    roles: ['administrator'],
  },
  {
    title: "Team Routing Rules",
    url: "/configuration/team-routing",
    icon: ArrowRightLeft,
    roles: ['administrator', 'crm manager'],
  },
  {
    title: "Smart Assignment",
    url: "/configuration/smart-assignment",
    icon: Settings2,
    roles: ['administrator', 'crm manager'],
  },
  {
    title: "KYC Questions Builder",
    url: "/configuration/kyc-questions",
    icon: ClipboardList,
    roles: ['administrator'],
  },
  {
    title: "Template Variables",
    url: "/configuration/template-variables",
    icon: Variable,
    roles: ['administrator'],
  },
  {
    title: "Security Settings",
    url: "/configuration/security-settings",
    icon: Lock,
    roles: ['administrator'],
  },
  {
    title: "SMTP Settings",
    url: "/configuration/smtp-settings",
    icon: Server,
    roles: ['administrator'],
  },
  {
    title: "Payment Providers",
    url: "/configuration/payment-providers",
    icon: CreditCard,
    roles: ['administrator'],
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();

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
      if (item.title === 'Sales Clients' && department !== 'sales') {
        return false;
      }
      // Retention CRM Managers only see Retention Clients
      if (item.title === 'Retention Clients' && department !== 'retention') {
        return false;
      }
      // If CRM Manager has a specific department, hide the "All Clients" aggregated view
      // They should use their department-specific view
      if (item.title === 'All Clients' && (department === 'sales' || department === 'retention')) {
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
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
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
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {filteredMenuItems.filter(item => item.title !== "Dashboard").map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredManagementItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
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
            <SidebarGroupLabel>Configuration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredConfigurationItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
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
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
