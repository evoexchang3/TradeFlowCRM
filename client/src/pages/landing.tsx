import { useEffect } from 'react';
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { TrendingUp, Shield, Users, UserCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface RoleInfo {
  id: string;
  name: string;
  icon: any;
  description: string;
  route: string;
}

const roles: RoleInfo[] = [
  {
    id: 'admin',
    name: 'Administrator',
    icon: Shield,
    description: 'Full system access and management',
    route: '/admin',
  },
  {
    id: 'crm',
    name: 'CRM Manager',
    icon: Users,
    description: 'CRM oversight and team management',
    route: '/crm',
  },
  {
    id: 'team',
    name: 'Team Leader',
    icon: UserCheck,
    description: 'Team and client management',
    route: '/team',
  },
  {
    id: 'agent',
    name: 'Agent',
    icon: User,
    description: 'Client support and operations',
    route: '/agent',
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuth();

  // Auto-redirect if already authenticated
  useEffect(() => {
    async function handleRedirect() {
      if (isAuthenticated && user && user.roleId) {
        try {
          // Fetch role to determine redirect
          const roleRes = await apiRequest('GET', `/api/roles/${user.roleId}`);
          const roleData = await roleRes.json();
          
          const roleRoute = roles.find(r => 
            r.name.toLowerCase() === roleData.name.toLowerCase()
          )?.route || '/dashboard';
          
          setLocation(roleRoute);
        } catch (error) {
          console.error('Failed to fetch role:', error);
          setLocation('/dashboard');
        }
      }
    }
    handleRedirect();
  }, [isAuthenticated, user, setLocation]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const res = await apiRequest('POST', '/api/login', data);
      return await res.json();
    },
    onSuccess: async (data) => {
      login(data.token, data);
      
      // Determine redirect based on role
      if (data.user) {
        // Fetch role to determine redirect
        const roleRes = await apiRequest('GET', `/api/roles/${data.user.roleId}`);
        const roleData = await roleRes.json();
        
        const roleRoute = roles.find(r => 
          r.name.toLowerCase() === roleData.name.toLowerCase()
        )?.route || '/dashboard';
        
        setLocation(roleRoute);
      } else {
        setLocation('/dashboard');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Trading Platform</h1>
              <p className="text-sm text-muted-foreground">Enterprise CRM System</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Secure access portal for administrators, managers, team leaders, and agents
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Select your role and enter your credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {roles.map((role) => (
                  <TabsTrigger 
                    key={role.id} 
                    value={role.id}
                    className="flex items-center gap-2"
                    data-testid={`tab-${role.id}`}
                  >
                    <role.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{role.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {roles.map((role) => (
                <TabsContent key={role.id} value={role.id} className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <role.icon className="h-6 w-6 text-primary" />
                      <h3 className="font-semibold">{role.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder={`Enter your ${role.name.toLowerCase()} email`}
                                {...field} 
                                data-testid={`input-email-${role.id}`} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password"
                                {...field} 
                                data-testid={`input-password-${role.id}`} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full hover-elevate active-elevate-2"
                        disabled={loginMutation.isPending}
                        data-testid={`button-login-${role.id}`}
                      >
                        {loginMutation.isPending ? 'Signing in...' : `Sign in as ${role.name}`}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-6 text-center">
              <a 
                href="/auth/forgot" 
                className="text-sm text-muted-foreground hover:text-primary"
                data-testid="link-forgot-password"
              >
                Forgot your password?
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
