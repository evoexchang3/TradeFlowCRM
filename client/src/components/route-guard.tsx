import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import type { Role, User } from "@shared/schema";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

export function RouteGuard({ children, allowedRoles, requireAuth = true }: RouteGuardProps) {
  const [, setLocation] = useLocation();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  
  // Always try to fetch user if auth is required (supports both localStorage and cookie-based auth)
  const { data: meData, isLoading: userLoading, error: userError } = useQuery<{ user?: User; client?: any }>({
    queryKey: ['/api/me'],
    enabled: requireAuth,
    retry: false,
  });

  const user = meData?.user;

  // Fetch user's role if they have a roleId
  const { data: role, isLoading: roleLoading } = useQuery<Role>({
    queryKey: [`/api/roles/${user?.roleId}`],
    enabled: !!user?.roleId,
    retry: false,
  });

  const isLoading = requireAuth && (userLoading || (!!user?.roleId && roleLoading));

  useEffect(() => {
    // Handle 401 errors - clear invalid token and redirect to login
    if (userError && !hasCheckedAuth) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setHasCheckedAuth(true);
      if (requireAuth) {
        setLocation('/login');
      }
      return;
    }

    if (isLoading) return;

    // If auth is required but API call failed to return user, redirect to login
    if (requireAuth && !userLoading && !user) {
      setLocation('/login');
      return;
    }

    // If user exists and allowedRoles specified, check permissions (case-insensitive)
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
          case 'sales team leader':
          case 'retention team leader':
            setLocation('/team');
            break;
          case 'sales agent':
          case 'retention agent':
            setLocation('/agent');
            break;
          default:
            setLocation('/dashboard');
        }
      }
    }
  }, [user, role, isLoading, allowedRoles, requireAuth, setLocation, userLoading, userError, hasCheckedAuth]);

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
