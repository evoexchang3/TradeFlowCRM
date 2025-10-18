import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings2, Plus, Trash2, Info, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSmartAssignmentSettingSchema, type SmartAssignmentSetting } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const settingFormSchema = insertSmartAssignmentSettingSchema.extend({});

type SettingFormData = z.infer<typeof settingFormSchema>;

export default function SmartAssignmentSettings() {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SmartAssignmentSetting | null>(null);
  const [deletingSettingId, setDeletingSettingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: globalSettings, isLoading: isLoadingGlobal } = useQuery<SmartAssignmentSetting>({
    queryKey: ['/api/smart-assignment-settings'],
  });

  const { data: teamSettings = [], isLoading: isLoadingTeams } = useQuery<SmartAssignmentSetting[]>({
    queryKey: ['/api/smart-assignment-settings/teams'],
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const form = useForm<SettingFormData>({
    resolver: zodResolver(settingFormSchema),
    defaultValues: {
      isEnabled: false,
      useWorkloadBalance: true,
      useLanguageMatch: true,
      usePerformanceHistory: true,
      useAvailability: true,
      useRoundRobin: true,
      teamId: null,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SettingFormData) => {
      return await apiRequest('POST', '/api/smart-assignment-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-assignment-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-assignment-settings/teams'] });
      toast({
        title: editingSetting ? t('smartAssignment.toast.settings.updated') : t('smartAssignment.toast.settings.saved'),
        description: t('smartAssignment.toast.settings.success'),
      });
      setIsDialogOpen(false);
      setEditingSetting(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('smartAssignment.toast.failed.save'),
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ enabled, teamId }: { enabled: boolean; teamId?: string | null }) => {
      return await apiRequest('PATCH', '/api/smart-assignment-settings/toggle', { enabled, teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-assignment-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-assignment-settings/teams'] });
      toast({
        title: t('smartAssignment.toast.settings.updated'),
        description: t('smartAssignment.toast.status.updated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('smartAssignment.toast.failed.update'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (settingId: string) => {
      return await apiRequest('DELETE', `/api/smart-assignment-settings/${settingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-assignment-settings/teams'] });
      toast({
        title: t('smartAssignment.toast.settings.deleted'),
        description: t('smartAssignment.toast.team.settings.removed'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('smartAssignment.toast.failed.delete'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: SettingFormData) => {
    saveMutation.mutate(data);
  };

  const handleEdit = (setting: SmartAssignmentSetting) => {
    setEditingSetting(setting);
    form.reset({
      teamId: setting.teamId,
      isEnabled: setting.isEnabled,
      useWorkloadBalance: setting.useWorkloadBalance,
      useLanguageMatch: setting.useLanguageMatch,
      usePerformanceHistory: setting.usePerformanceHistory,
      useAvailability: setting.useAvailability,
      useRoundRobin: setting.useRoundRobin,
    });
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingSettingId) {
      deleteMutation.mutate(deletingSettingId);
      setDeletingSettingId(null);
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return t('smartAssignment.global');
    const team = teams.find(t => t.id === teamId);
    return team?.name || teamId;
  };

  if (isLoadingGlobal) {
    return (
      <div className="p-6 space-y-6" data-testid="loading-smart-assignment">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-smart-assignment-title">{t('smartAssignment.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('smartAssignment.subtitle')}
          </p>
        </div>
      </div>

      <Card data-testid="card-global-settings">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t('smartAssignment.global.settings')}
              </CardTitle>
              <CardDescription className="mt-1">
                {t('smartAssignment.global.description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="global-toggle" className="text-sm">
                {globalSettings?.isEnabled ? t('common.enabled') : t('common.disabled')}
              </Label>
              <Switch
                id="global-toggle"
                checked={globalSettings?.isEnabled || false}
                onCheckedChange={(checked) => toggleMutation.mutate({ enabled: checked })}
                disabled={toggleMutation.isPending}
                data-testid="switch-global-enabled"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('smartAssignment.global.info')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="workload" className="font-medium">{t('smartAssignment.workload.balance')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('smartAssignment.workload.description')}</p>
              </div>
              <Switch
                id="workload"
                checked={globalSettings?.useWorkloadBalance}
                disabled
                data-testid="switch-global-workload"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="language" className="font-medium">{t('smartAssignment.language.match')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('smartAssignment.language.description')}</p>
              </div>
              <Switch
                id="language"
                checked={globalSettings?.useLanguageMatch}
                disabled
                data-testid="switch-global-language"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="performance" className="font-medium">{t('smartAssignment.performance.history')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('smartAssignment.performance.description')}</p>
              </div>
              <Switch
                id="performance"
                checked={globalSettings?.usePerformanceHistory}
                disabled
                data-testid="switch-global-performance"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="availability" className="font-medium">{t('smartAssignment.agent.availability')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('smartAssignment.availability.description')}</p>
              </div>
              <Switch
                id="availability"
                checked={globalSettings?.useAvailability}
                disabled
                data-testid="switch-global-availability"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="roundrobin" className="font-medium">{t('smartAssignment.round.robin')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('smartAssignment.round.robin.description')}</p>
              </div>
              <Switch
                id="roundrobin"
                checked={globalSettings?.useRoundRobin}
                disabled
                data-testid="switch-global-roundrobin"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-team-overrides">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('smartAssignment.team.overrides')}</CardTitle>
              <CardDescription className="mt-1">
                {t('smartAssignment.team.overrides.description')}
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingSetting(null);
                    form.reset({
                      isEnabled: false,
                      useWorkloadBalance: true,
                      useLanguageMatch: true,
                      usePerformanceHistory: true,
                      useAvailability: true,
                      useRoundRobin: true,
                      teamId: null,
                    });
                  }}
                  data-testid="button-add-team-setting"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('smartAssignment.add.team.override')}
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-team-setting-form">
                <DialogHeader>
                  <DialogTitle>
                    {editingSetting ? t('smartAssignment.dialog.title.edit') : t('smartAssignment.dialog.title.create')}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('common.team')}</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={(value) => field.onChange(value || null)}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-team">
                                <SelectValue placeholder={t('smartAssignment.select.team')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teams.map((team) => (
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

                    <FormField
                      control={form.control}
                      name="isEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <FormLabel>{t('smartAssignment.enable.for.team')}</FormLabel>
                            <p className="text-xs text-muted-foreground mt-0.5">{t('smartAssignment.override.global')}</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-team-enabled"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-3">
                      <FormField
                        control={form.control}
                        name="useWorkloadBalance"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-2 border rounded">
                            <FormLabel className="text-sm">{t('smartAssignment.workload.balance')}</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-team-workload"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="useLanguageMatch"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-2 border rounded">
                            <FormLabel className="text-sm">{t('smartAssignment.language.match')}</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-team-language"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="usePerformanceHistory"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-2 border rounded">
                            <FormLabel className="text-sm">{t('smartAssignment.performance.history')}</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-team-performance"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="useAvailability"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-2 border rounded">
                            <FormLabel className="text-sm">{t('smartAssignment.agent.availability')}</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-team-availability"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="useRoundRobin"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-2 border rounded">
                            <FormLabel className="text-sm">{t('smartAssignment.round.robin')}</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-team-roundrobin"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingSetting(null);
                          form.reset();
                        }}
                        data-testid="button-cancel-team-setting"
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        disabled={saveMutation.isPending}
                        data-testid="button-save-team-setting"
                      >
                        {saveMutation.isPending ? t('common.saving') : (editingSetting ? t('smartAssignment.update.settings') : t('smartAssignment.save.settings'))}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTeams ? (
            <div className="space-y-2" data-testid="loading-team-settings">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : teamSettings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="empty-team-settings">
              {t('smartAssignment.no.team.settings')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.team')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('smartAssignment.table.workload')}</TableHead>
                  <TableHead>{t('smartAssignment.table.language')}</TableHead>
                  <TableHead>{t('smartAssignment.table.performance')}</TableHead>
                  <TableHead>{t('smartAssignment.table.availability')}</TableHead>
                  <TableHead>{t('smartAssignment.table.round.robin')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamSettings.map((setting: SmartAssignmentSetting) => (
                  <TableRow key={setting.id} data-testid={`row-team-setting-${setting.id}`}>
                    <TableCell className="font-medium" data-testid={`text-team-name-${setting.id}`}>
                      {getTeamName(setting.teamId)}
                    </TableCell>
                    <TableCell>
                      {setting.isEnabled ? (
                        <Badge variant="default" data-testid={`badge-enabled-${setting.id}`}>
                          <span data-testid={`text-status-${setting.id}`}>{t('common.enabled')}</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-disabled-${setting.id}`}>
                          <span data-testid={`text-status-${setting.id}`}>{t('common.disabled')}</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-workload-${setting.id}`}>
                      {setting.useWorkloadBalance ? "✓" : "—"}
                    </TableCell>
                    <TableCell data-testid={`text-language-${setting.id}`}>
                      {setting.useLanguageMatch ? "✓" : "—"}
                    </TableCell>
                    <TableCell data-testid={`text-performance-${setting.id}`}>
                      {setting.usePerformanceHistory ? "✓" : "—"}
                    </TableCell>
                    <TableCell data-testid={`text-availability-${setting.id}`}>
                      {setting.useAvailability ? "✓" : "—"}
                    </TableCell>
                    <TableCell data-testid={`text-roundrobin-${setting.id}`}>
                      {setting.useRoundRobin ? "✓" : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(setting)}
                          data-testid={`button-edit-${setting.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingSettingId(setting.id)}
                          data-testid={`button-delete-${setting.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingSettingId} onOpenChange={(open) => !open && setDeletingSettingId(null)}>
        <AlertDialogContent data-testid="dialog-delete-team-setting">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">{t('smartAssignment.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              {t('smartAssignment.delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="button-confirm-delete">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
