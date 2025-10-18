import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

type ClientFormData = z.infer<ReturnType<typeof getClientFormSchema>>;

function getClientFormSchema(t: (key: string) => string) {
  return z.object({
    firstName: z.string().min(1, t('client.form.validation.first.name.required')),
    lastName: z.string().min(1, t('client.form.validation.last.name.required')),
    email: z.string().email(t('client.form.validation.email.invalid')),
    password: z.string().transform(val => val === '' ? undefined : val).pipe(z.string().min(6, t('client.form.validation.password.min')).optional()),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    dateOfBirth: z.string().optional(),
    kycStatus: z.enum(['pending', 'verified', 'rejected']).default('pending'),
    assignedAgentId: z.string().optional(),
    teamId: z.string().optional(),
  });
}

export default function ClientForm() {
  const { t } = useLanguage();
  const [, params] = useRoute("/clients/:id/edit");
  const [, setLocation] = useLocation();
  const isEdit = !!params?.id;
  const { toast } = useToast();

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['/api/clients', params?.id],
    enabled: isEdit,
  });

  const { data: agents } = useQuery({
    queryKey: ['/api/users/agents'],
  });

  const { data: teams } = useQuery({
    queryKey: ['/api/teams'],
  });

  const clientFormSchema = getClientFormSchema(t);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: client || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      kycStatus: "pending",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ClientFormData) => apiRequest('POST', '/api/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: t('client.form.toast.created.title'),
        description: t('client.form.toast.created.description'),
      });
      setLocation('/clients');
    },
    onError: () => {
      toast({
        title: t('client.form.toast.create.failed.title'),
        description: t('client.form.toast.create.failed.description'),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ClientFormData) => 
      apiRequest('PATCH', `/api/clients/${params?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: t('client.form.toast.updated.title'),
        description: t('client.form.toast.updated.description'),
      });
      setLocation(`/clients/${params?.id}`);
    },
    onError: () => {
      toast({
        title: t('client.form.toast.update.failed.title'),
        description: t('client.form.toast.update.failed.description'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClientFormData) => {
    const submitData = { ...data };
    if (!submitData.password) {
      delete submitData.password;
    }
    
    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isEdit && loadingClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back" className="hover-elevate">
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? t('client.form.title.edit') : t('client.form.title.new')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? t('client.form.subtitle.edit') : t('client.form.subtitle.new')}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('client.form.personal.info')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.first.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.last.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-email" />
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
                      <FormLabel>{t('client.form.password')} {isEdit && <span className="text-muted-foreground text-xs">{t('client.form.password.helper')}</span>}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-password" placeholder={isEdit ? t('client.form.password.placeholder.edit') : t('client.form.password.placeholder.new')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.phone')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.date.of.birth')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date-of-birth" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('client.form.address.section')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('client.form.street.address')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.city')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.country')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('client.form.account.settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="kycStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.kyc.status')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-kyc-status">
                            <SelectValue placeholder={t('client.form.kyc.select.placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">{t('client.form.kyc.pending')}</SelectItem>
                          <SelectItem value="verified">{t('client.form.kyc.verified')}</SelectItem>
                          <SelectItem value="rejected">{t('client.form.kyc.rejected')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedAgentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('client.form.assigned.agent')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-agent">
                            <SelectValue placeholder={t('client.form.select.agent.placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(agents as any)?.map((agent: any) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('client.form.team')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-team">
                          <SelectValue placeholder={t('client.form.select.team.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(teams as any)?.map((team: any) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/clients')}
              data-testid="button-cancel"
              className="hover-elevate active-elevate-2"
            >
              {t('client.form.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit"
              className="hover-elevate active-elevate-2"
            >
              {createMutation.isPending || updateMutation.isPending
                ? t('client.form.saving')
                : isEdit
                ? t('client.form.update.client')
                : t('client.form.create.client')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
