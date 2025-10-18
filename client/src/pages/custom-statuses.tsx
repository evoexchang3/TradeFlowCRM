import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Circle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { insertCustomStatusSchema } from "@shared/schema";

const statusSchema = insertCustomStatusSchema;

type StatusFormData = z.infer<typeof statusSchema>;

export default function CustomStatuses() {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [transitionsText, setTransitionsText] = useState("[]");
  const [automationText, setAutomationText] = useState("[]");
  const { toast } = useToast();

  const { data: statuses = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/custom-statuses'],
  });

  const form = useForm<StatusFormData>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
      icon: "",
      category: "sales",
      allowedTransitions: [],
      automationTriggers: [],
      sortOrder: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: StatusFormData) => apiRequest('/api/custom-statuses', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-statuses'] });
      toast({ title: t('common.success'), description: t('customStatuses.toast.created') });
      setTransitionsText("[]");
      setAutomationText("[]");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: StatusFormData & { id: string }) => apiRequest(`/api/custom-statuses/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-statuses'] });
      toast({ title: t('common.success'), description: t('customStatuses.toast.updated') });
      setEditingStatus(null);
      setTransitionsText("[]");
      setAutomationText("[]");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/custom-statuses/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-statuses'] });
      toast({ title: t('common.success'), description: t('customStatuses.toast.deleted') });
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: StatusFormData) => {
    try {
      const transitions = JSON.parse(transitionsText);
      const automation = JSON.parse(automationText);
      
      const finalData = {
        ...data,
        allowedTransitions: transitions,
        automationTriggers: automation,
      };
      
      if (editingStatus) {
        updateMutation.mutate({ id: editingStatus.id, ...finalData });
      } else {
        createMutation.mutate(finalData);
      }
    } catch (e) {
      toast({ 
        title: t('customStatuses.toast.invalidJson'), 
        description: t('customStatuses.toast.invalidJsonDescription'), 
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (status: any) => {
    setEditingStatus(status);
    setTransitionsText(JSON.stringify(status.allowedTransitions || [], null, 2));
    setAutomationText(JSON.stringify(status.automationTriggers || [], null, 2));
    form.reset({
      name: status.name,
      color: status.color,
      icon: status.icon || "",
      category: status.category,
      allowedTransitions: status.allowedTransitions || [],
      automationTriggers: status.automationTriggers || [],
      sortOrder: status.sortOrder,
      isActive: status.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingStatus(null);
      setTransitionsText("[]");
      setAutomationText("[]");
      form.reset();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('customStatuses.confirm.delete'))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('customStatuses.title')}</h1>
          <p className="text-muted-foreground">{t('customStatuses.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-status">
              <Plus className="h-4 w-4 mr-2" />
              {t('customStatuses.addStatus')}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-status-form">
            <DialogHeader>
              <DialogTitle>{editingStatus ? t('customStatuses.editStatus') : t('customStatuses.createNewStatus')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customStatuses.form.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('customStatuses.form.namePlaceholder')} data-testid="input-status-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customStatuses.form.color')}</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" {...field} data-testid="input-status-color" className="w-20" />
                          <Input {...field} placeholder={t('customStatuses.form.colorPlaceholder')} className="flex-1" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customStatuses.form.category')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status-category">
                            <SelectValue placeholder={t('customStatuses.form.categoryPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sales">{t('customStatuses.form.category.sales')}</SelectItem>
                          <SelectItem value="retention">{t('customStatuses.form.category.retention')}</SelectItem>
                          <SelectItem value="kyc">{t('customStatuses.form.category.kyc')}</SelectItem>
                          <SelectItem value="other">{t('customStatuses.form.category.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customStatuses.form.icon')}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder={t('customStatuses.form.iconPlaceholder')} data-testid="input-status-icon" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customStatuses.form.sortOrder')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-status-sort" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowedTransitions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customStatuses.form.allowedTransitions')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          value={transitionsText}
                          onChange={(e) => setTransitionsText(e.target.value)}
                          onBlur={() => {
                            try {
                              const parsed = JSON.parse(transitionsText);
                              field.onChange(parsed);
                            } catch (e) {
                              toast({ 
                                title: t('customStatuses.toast.invalidJson'), 
                                description: t('customStatuses.toast.invalidTransitions'), 
                                variant: "destructive" 
                              });
                            }
                          }}
                          placeholder={t('customStatuses.form.transitionsPlaceholder')}
                          data-testid="input-status-transitions"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="automationTriggers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customStatuses.form.automationTriggers')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          value={automationText}
                          onChange={(e) => setAutomationText(e.target.value)}
                          onBlur={() => {
                            try {
                              const parsed = JSON.parse(automationText);
                              field.onChange(parsed);
                            } catch (e) {
                              toast({ 
                                title: t('customStatuses.toast.invalidJson'), 
                                description: t('customStatuses.toast.invalidAutomation'), 
                                variant: "destructive" 
                              });
                            }
                          }}
                          placeholder={t('customStatuses.form.automationPlaceholder')}
                          data-testid="input-status-automation"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>{t('customStatuses.form.active')}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-status-active" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="submit" 
                    data-testid="button-submit-status"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingStatus ? t('customStatuses.button.updateStatus') : t('customStatuses.button.createStatus')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">{t('customStatuses.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statuses.map((status) => (
            <Card key={status.id} className="hover-elevate" data-testid={`card-status-${status.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4" style={{ fill: status.color, color: status.color }} />
                    <CardTitle className="text-lg">{status.name}</CardTitle>
                  </div>
                  <Badge variant={status.isActive ? "default" : "secondary"}>
                    {status.isActive ? t('customStatuses.badge.active') : t('customStatuses.badge.inactive')}
                  </Badge>
                </div>
                <CardDescription>{t('customStatuses.category')} {status.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('customStatuses.order')} {status.sortOrder}</span>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(status)}
                      data-testid={`button-edit-${status.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(status.id)}
                      data-testid={`button-delete-${status.id}`}
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

      {!isLoading && statuses.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>{t('customStatuses.empty.title')}</p>
              <p className="text-sm mt-2">{t('customStatuses.empty.description')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
