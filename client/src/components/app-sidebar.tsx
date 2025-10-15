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
  Wallet
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import type { Role } from "@shared/schema";

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
  },
  {
    title: "Retention Clients",
    url: "/clients/retention",
    icon: UserCheck,
  },
  {
    title: "All Clients",
    url: "/clients",
    icon: Users,
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
  },
  {
    title: "Closed Positions",
    url: "/trading/closed-positions",
    icon: TrendingDown,
  },
  {
    title: "Trading",
    url: "/trading",
    icon: TrendingUp,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: DollarSign,
  },
  {
    title: "Sales Dashboard",
    url: "/reports/sales",
    icon: BarChart3,
    roles: ['administrator', 'crm manager', 'team leader'],
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
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();

  // Fetch user's role to filter menu items
  const { data: role } = useQuery<Role>({
    queryKey: [`/api/roles/${user?.roleId}`],
    enabled: !!user?.roleId,
  });

  const roleName = role?.name?.toLowerCase() || '';

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  // Filter menu items based on role
  const filterByRole = (item: MenuItem) => {
    if (!item.roles) return true; // No role restriction
    return item.roles.includes(roleName);
  };

  const filteredMenuItems = menuItems.filter(filterByRole);
  const filteredManagementItems = managementItems.filter(filterByRole);

  // Determine dashboard URL based on role
  const dashboardUrl = roleName === 'administrator' ? '/admin' :
                       roleName === 'crm manager' ? '/crm' :
                       roleName === 'team leader' ? '/team' :
                       roleName === 'agent' ? '/agent' : '/dashboard';

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
