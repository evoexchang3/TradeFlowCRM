import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Shield, Trash2, Edit, Clock, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import * as z from "zod";

interface SecuritySetting {
  id: string;
  settingKey: string;
  settingValue: string;
  category: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

function SettingCard({ setting, onEdit, onDelete }: {
  setting: SecuritySetting;
  onEdit: (setting: SecuritySetting) => void;
  onDelete: (id: string) => void;
}) {
  const getIcon = () => {
    switch (setting.category) {
      case "ip_whitelist":
        return <Shield className="h-4 w-4" />;
      case "session":
        return <Clock className="h-4 w-4" />;
      case "2fa":
        return <Lock className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5">{getIcon()}</div>
            <div className="flex-1">
              <CardTitle className="text-base" data-testid={`text-setting-${setting.id}`}>
                {setting.settingKey}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {setting.description || setting.category}
              </CardDescription>
              <p className="text-sm mt-2 font-mono bg-muted px-2 py-1 rounded">
                {setting.settingValue}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(setting)}
              data-testid={`button-edit-${setting.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(setting.id)}
              data-testid={`button-delete-${setting.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function SecuritySettings() {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SecuritySetting | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  const settingFormSchema = z.object({
    settingKey: z.string().min(1, t('security.validation.key.required')),
    settingValue: z.string(),
    category: z.string(),
    description: z.string().optional(),
  });

  type SettingFormData = z.infer<typeof settingFormSchema>;

  const { data: settings = [], isLoading } = useQuery<SecuritySetting[]>({
    queryKey: ['/api/security-settings'],
  });

  const form = useForm<SettingFormData>({
    resolver: zodResolver(settingFormSchema),
    defaultValues: {
      settingKey: "",
      settingValue: "",
      category: "ip_whitelist",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: SettingFormData) => apiRequest('/api/security-settings', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security-settings'] });
      toast({ title: t('common.success'), description: t('security.toast.created') });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/security-settings/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security-settings'] });
      toast({ title: t('common.success'), description: t('security.toast.updated') });
      setEditingSetting(null);
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/security-settings/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security-settings'] });
      toast({ title: t('common.success'), description: t('security.toast.deleted') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: SettingFormData) => {
    if (editingSetting) {
      updateMutation.mutate({ id: editingSetting.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (setting: SecuritySetting) => {
    setEditingSetting(setting);
    form.reset({
      settingKey: setting.settingKey,
      settingValue: setting.settingValue,
      category: setting.category,
      description: setting.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingSetting(null);
      form.reset();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('security.confirm.delete'))) {
      deleteMutation.mutate(id);
    }
  };

  const filteredSettings = selectedCategory === "all"
    ? settings
    : settings.filter(s => s.category === selectedCategory);

  const categories = Array.from(new Set(settings.map(s => s.category)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">{t('security.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('security.title')}</h1>
          <p className="text-muted-foreground">{t('security.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-setting">
              <Plus className="h-4 w-4 mr-2" />
              {t('security.add.setting')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSetting ? t('security.edit.setting') : t('security.create.setting')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('security.category')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ip_whitelist">{t('security.category.ip.whitelist')}</SelectItem>
                          <SelectItem value="session">{t('security.category.session')}</SelectItem>
                          <SelectItem value="2fa">{t('security.category.2fa')}</SelectItem>
                          <SelectItem value="password">{t('security.category.password')}</SelectItem>
                          <SelectItem value="other">{t('security.category.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settingKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('security.setting.key')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('security.placeholder.allowed.ips')} data-testid="input-setting-key" />
                      </FormControl>
                      <FormDescription>
                        {t('security.setting.key.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settingValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('security.setting.value')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('security.placeholder.ip.addresses')}
                          data-testid="input-setting-value"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('security.setting.value.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('security.description.optional')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('security.placeholder.description')}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                    data-testid="button-cancel"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? t('common.saving')
                      : editingSetting
                      ? t('security.update.setting')
                      : t('security.create.setting.button')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48" data-testid="select-filter-category">
            <SelectValue placeholder={t('security.filter.by.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('security.all.categories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filteredSettings.length}{filteredSettings.length !== 1 ? t('security.settings') : t('security.setting')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSettings.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="p-6 text-center text-muted-foreground">
              {selectedCategory === "all"
                ? t('security.no.settings')
                : t('security.no.settings.category')}
            </CardContent>
          </Card>
        ) : (
          filteredSettings.map((setting) => (
            <SettingCard
              key={setting.id}
              setting={setting}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('security.common.settings')}</CardTitle>
          <CardDescription>{t('security.examples.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p className="font-medium">{t('security.example.ip.whitelist')}</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">allowed_ips = 192.168.1.1,10.0.0.1</code>
          </div>
          <div className="text-sm">
            <p className="font-medium">{t('security.example.session.timeout')}</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">session_timeout_minutes = 30</code>
          </div>
          <div className="text-sm">
            <p className="font-medium">{t('security.example.2fa.roles')}</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">2fa_required_roles = Administrator,CRM Manager</code>
          </div>
          <div className="text-sm">
            <p className="font-medium">{t('security.example.password.length')}</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">password_min_length = 12</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
