import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Server, Mail, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { insertSmtpSettingSchema } from "@shared/schema";

const smtpFormSchema = insertSmtpSettingSchema;

type SmtpFormData = z.infer<typeof smtpFormSchema>;

export default function SmtpSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/smtp-settings'],
  });

  const form = useForm<SmtpFormData>({
    resolver: zodResolver(smtpFormSchema),
    defaultValues: {
      host: "",
      port: 587,
      username: "",
      password: "",
      fromEmail: "",
      fromName: "",
      useTLS: true,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SmtpFormData) => {
      const res = await apiRequest('POST', '/api/smtp-settings', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smtp-settings'] });
      toast({ title: t('common.success'), description: t('smtp.created.success') });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & SmtpFormData) => {
      const res = await apiRequest('PATCH', `/api/smtp-settings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smtp-settings'] });
      toast({ title: t('common.success'), description: t('smtp.updated.success') });
      setEditingSetting(null);
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/smtp-settings/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smtp-settings'] });
      toast({ title: t('common.success'), description: t('smtp.deleted.success') });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: SmtpFormData) => {
    if (editingSetting) {
      updateMutation.mutate({ id: editingSetting.id, ...data } as any);
    } else {
      createMutation.mutate(data as any);
    }
  };

  const handleEdit = (setting: any) => {
    setEditingSetting(setting);
    form.reset({
      host: setting.host,
      port: setting.port,
      username: setting.username,
      password: setting.password,
      fromEmail: setting.fromEmail,
      fromName: setting.fromName,
      useTLS: setting.useTLS,
      isActive: setting.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('smtp.delete.confirm'))) {
      deleteMutation.mutate(id as any);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSetting(null);
    form.reset();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('smtp.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('smtp.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-smtp">
              <Plus className="h-4 w-4 mr-2" />
              {t('smtp.add.configuration')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingSetting ? t('smtp.edit.configuration') : t('smtp.add.configuration')}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('smtp.host')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('smtp.host.placeholder')} {...field} data-testid="input-host" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('smtp.port')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={t('smtp.port.placeholder')} 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-port" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('smtp.username')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('smtp.username.placeholder')} {...field} data-testid="input-username" />
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
                        <FormLabel>{t('smtp.password')}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={t('smtp.password.placeholder')} {...field} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('smtp.from.email')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('smtp.from.email.placeholder')} {...field} data-testid="input-from-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('smtp.from.name')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('smtp.from.name.placeholder')} {...field} data-testid="input-from-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="useTLS"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('smtp.use.tls')}</FormLabel>
                          <FormDescription className="text-xs">
                            {t('smtp.use.tls.description')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-use-tls"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('common.active')}</FormLabel>
                          <FormDescription className="text-xs">
                            {t('smtp.enable.configuration')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending || updateMutation.isPending ? t('common.saving') : t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('smtp.no.configurations')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('smtp.no.configurations.description')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {settings.map((setting) => (
            <Card key={setting.id} className="hover-elevate" data-testid={`card-smtp-${setting.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-smtp-host-${setting.id}`}>
                        {setting.host}:{setting.port}
                      </CardTitle>
                      <CardDescription data-testid={`text-smtp-from-${setting.id}`}>
                        {setting.fromName} &lt;{setting.fromEmail}&gt;
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {setting.isActive ? (
                      <Badge variant="default" className="gap-1" data-testid={`badge-status-${setting.id}`}>
                        <Check className="h-3 w-3" />
                        {t('common.active')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1" data-testid={`badge-status-${setting.id}`}>
                        <X className="h-3 w-3" />
                        {t('common.inactive')}
                      </Badge>
                    )}
                    {setting.useTLS && (
                      <Badge variant="outline">{t('smtp.security.tls.ssl')}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('smtp.username')}:</span>
                      <span className="ml-2 font-medium">{setting.username}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('smtp.security')}:</span>
                      <span className="ml-2 font-medium">{setting.useTLS ? t('smtp.security.tls.ssl') : t('smtp.security.none')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(setting)}
                      data-testid={`button-edit-${setting.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(setting.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${setting.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
