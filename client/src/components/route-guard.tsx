import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

export function RouteGuard({ children, allowedRoles, requireAuth = true }: RouteGuardProps) {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/me'],
    retry: false,
  });

  useEffect(() => {
    if (isLoading) return;

    // If auth is required but no user, redirect to login
    if (requireAuth && !user) {
      setLocation('/');
      return;
    }

    // If user exists and allowedRoles specified, check permissions
    if (user && allowedRoles && allowedRoles.length > 0) {
      const userRole = user.role?.name.toLowerCase();
      const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);
      
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
  }, [user, isLoading, allowedRoles, requireAuth, setLocation]);

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
  if (user && allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role?.name.toLowerCase();
    const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);
    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
}
