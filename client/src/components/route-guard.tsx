import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import type { Role, User } from "@shared/schema";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

export function RouteGuard({ children, allowedRoles, requireAuth = true }: RouteGuardProps) {
  const [, setLocation] = useLocation();
  
  const { data: meData, isLoading: userLoading } = useQuery<{ user?: User; client?: any }>({
    queryKey: ['/api/me'],
    retry: false,
  });

  const user = meData?.user;

  // Fetch user's role if they have a roleId
  const { data: role, isLoading: roleLoading } = useQuery<Role>({
    queryKey: [`/api/roles/${user?.roleId}`],
    enabled: !!user?.roleId,
  });

  const isLoading = userLoading || (!!user?.roleId && roleLoading);

  useEffect(() => {
    if (isLoading) return;

    // If auth is required but no user, redirect to login
    if (requireAuth && !user) {
      setLocation('/');
      return;
    }

    // If user exists and allowedRoles specified, check permissions
    if (user && allowedRoles && allowedRoles.length > 0 && role) {
      const userRole = role.name.toLowerCase();
      const hasAccess = allowedRoles.some(r => r.toLowerCase() === userRole);
      
      if (!hasAccess) {
        // Redirect to user's default dashboard based on their role
        switch (userRole) {
          case 'administrator':
            setLocation('/admin');
            break;
          case 'crm manager':
            setLocation('/crm');
            break;
          case 'team leader':
            setLocation('/team');
            break;
          case 'agent':
            setLocation('/agent');
            break;
          default:
            setLocation('/');
        }
      }
    }
  }, [user, role, isLoading, allowedRoles, requireAuth, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children if auth check failed
  if (requireAuth && !user) {
    return null;
  }

  // Don't render if role check failed
  if (user && allowedRoles && allowedRoles.length > 0 && role) {
    const userRole = role.name.toLowerCase();
    const hasAccess = allowedRoles.some(r => r.toLowerCase() === userRole);
    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
}
