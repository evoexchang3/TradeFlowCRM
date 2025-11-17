import { useEffect } from 'react';
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useLanguage } from "@/contexts/LanguageContext";

const roleRoutes: Record<string, string> = {
  'administrator': '/admin',
  'crm manager': '/crm',
  'sales manager': '/dashboard', // No dedicated dashboard for managers yet
  'retention manager': '/dashboard', // No dedicated dashboard for managers yet
  'sales team leader': '/team',
  'retention team leader': '/team',
  'sales agent': '/agent',
  'retention agent': '/agent',
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();

  const loginSchema = z.object({
    email: z.string().min(1, t('validation.email.required')).email(t('validation.email.invalid')),
    password: z.string().min(1, t('validation.password.required')),
  });

  type LoginFormData = z.infer<typeof loginSchema>;

  // Auto-redirect if already authenticated
  useEffect(() => {
    async function handleRedirect() {
      if (isAuthenticated && user && user.roleId) {
        try {
          // Fetch role to determine redirect
          const roleRes = await apiRequest('GET', `/api/roles/${user.roleId}`);
          const roleData = await roleRes.json();
          
          const roleRoute = roleRoutes[roleData.name.toLowerCase()] || '/dashboard';
          
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
      // Set token in localStorage immediately before API calls
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user || data.client));
      
      // Update auth context
      login(data.token, data);
      
      // Determine redirect based on role
      if (data.user) {
        try {
          // Fetch role to determine redirect
          const roleRes = await apiRequest('GET', `/api/roles/${data.user.roleId}`);
          const roleData = await roleRes.json();
          
          const roleRoute = roleRoutes[roleData.name.toLowerCase()] || '/dashboard';
          
          setLocation(roleRoute);
        } catch (error) {
          console.error('Failed to fetch role:', error);
          setLocation('/dashboard');
        }
      } else {
        setLocation('/dashboard');
      }
    },
    onError: (error: any) => {
      toast({
        title: t('toast.login.failed'),
        description: error.message || t('toast.invalid.credentials'),
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

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{t('landing.hero.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('landing.hero.subtitle')}</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t('landing.features.subtitle')}
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('landing.cta.title')}</CardTitle>
            <CardDescription>
              {t('auth.sign.in')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder={t('auth.email')}
                          {...field} 
                          data-testid="input-email" 
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
                      <FormLabel>{t('auth.password')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder={t('auth.password')}
                          {...field} 
                          data-testid="input-password" 
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
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? t('auth.login.button') : t('landing.cta.button')}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <a 
                href="/auth/forgot" 
                className="text-sm text-muted-foreground hover:text-primary"
                data-testid="link-forgot-password"
              >
                {t('auth.forgot.password')}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
