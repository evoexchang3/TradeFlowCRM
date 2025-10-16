import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, CreditCard, Check, X, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { insertPaymentProviderSchema } from "@shared/schema";

const paymentFormSchema = insertPaymentProviderSchema.extend({
  transactionFeePercent: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

const PROVIDER_TYPES = [
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export default function PaymentProviders() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [configText, setConfigText] = useState("{}");
  const [currenciesText, setCurrenciesText] = useState("[]");
  const { toast } = useToast();

  const { data: providers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/payment-providers'],
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      name: "",
      providerType: "stripe",
      apiKey: "",
      apiSecret: "",
      webhookSecret: "",
      webhookUrl: "",
      configuration: {},
      isPrimary: false,
      isActive: true,
      supportedCurrencies: [],
      transactionFeePercent: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('/api/payment-providers', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-providers'] });
      toast({ title: "Success", description: "Payment provider created successfully" });
      setConfigText("{}");
      setCurrenciesText("[]");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => apiRequest(`/api/payment-providers/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-providers'] });
      toast({ title: "Success", description: "Payment provider updated successfully" });
      setEditingProvider(null);
      setConfigText("{}");
      setCurrenciesText("[]");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/api/payment-providers/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-providers'] });
      toast({ title: "Success", description: "Payment provider deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: PaymentFormData) => {
    try {
      const config = JSON.parse(configText);
      const currencies = JSON.parse(currenciesText);
      
      const finalData = {
        ...data,
        configuration: config,
        supportedCurrencies: currencies,
        transactionFeePercent: data.transactionFeePercent ? parseFloat(data.transactionFeePercent as string) : null,
      };
      
      if (editingProvider) {
        updateMutation.mutate({ id: editingProvider.id, ...finalData } as any);
      } else {
        createMutation.mutate(finalData as any);
      }
    } catch (e) {
      toast({ 
        title: "Invalid JSON", 
        description: "Please fix JSON syntax in configuration or currencies fields", 
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (provider: any) => {
    setEditingProvider(provider);
    setConfigText(JSON.stringify(provider.configuration || {}, null, 2));
    setCurrenciesText(JSON.stringify(provider.supportedCurrencies || [], null, 2));
    form.reset({
      name: provider.name,
      providerType: provider.providerType,
      apiKey: provider.apiKey || "",
      apiSecret: provider.apiSecret || "",
      webhookSecret: provider.webhookSecret || "",
      webhookUrl: provider.webhookUrl || "",
      configuration: provider.configuration || {},
      isPrimary: provider.isPrimary,
      isActive: provider.isActive,
      supportedCurrencies: provider.supportedCurrencies || [],
      transactionFeePercent: provider.transactionFeePercent !== null && provider.transactionFeePercent !== undefined ? String(provider.transactionFeePercent) : "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this payment provider?")) {
      deleteMutation.mutate(id as any);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingProvider(null);
    setConfigText("{}");
    setCurrenciesText("[]");
    form.reset();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Payment Providers</h1>
          <p className="text-muted-foreground mt-1">Manage payment service provider integrations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-provider">
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingProvider ? "Edit Payment Provider" : "Add Payment Provider"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Stripe Production" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="providerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-provider-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROVIDER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="pk_live_..." {...field} data-testid="input-api-key" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="sk_live_..." {...field} data-testid="input-api-secret" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="webhookSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Secret</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="whsec_..." {...field} data-testid="input-webhook-secret" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} data-testid="input-webhook-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="transactionFeePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Fee (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="2.9" {...field} data-testid="input-transaction-fee" />
                      </FormControl>
                      <FormDescription>Percentage fee charged per transaction</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Supported Currencies (JSON Array)</FormLabel>
                  <Textarea
                    value={currenciesText}
                    onChange={(e) => setCurrenciesText(e.target.value)}
                    onBlur={() => {
                      try {
                        JSON.parse(currenciesText);
                      } catch (e) {
                        toast({ title: "Invalid JSON", description: "Check currencies syntax", variant: "destructive" });
                      }
                    }}
                    placeholder='["USD", "EUR", "GBP"]'
                    className="font-mono text-sm min-h-[80px]"
                    data-testid="textarea-currencies"
                  />
                  <FormDescription className="text-xs">
                    List of currency codes (e.g., ["USD", "EUR", "GBP"])
                  </FormDescription>
                </div>

                <div className="space-y-2">
                  <FormLabel>Configuration (JSON)</FormLabel>
                  <Textarea
                    value={configText}
                    onChange={(e) => setConfigText(e.target.value)}
                    onBlur={() => {
                      try {
                        JSON.parse(configText);
                      } catch (e) {
                        toast({ title: "Invalid JSON", description: "Check configuration syntax", variant: "destructive" });
                      }
                    }}
                    placeholder='{"key": "value"}'
                    className="font-mono text-sm min-h-[100px]"
                    data-testid="textarea-configuration"
                  />
                  <FormDescription className="text-xs">
                    Additional provider-specific configuration
                  </FormDescription>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isPrimary"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Primary Provider</FormLabel>
                          <FormDescription className="text-xs">
                            Use as default for payments
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-primary"
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
                          <FormLabel>Active</FormLabel>
                          <FormDescription className="text-xs">
                            Enable this provider
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
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No payment providers configured</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first payment provider to process transactions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map((provider) => (
            <Card key={provider.id} className="hover-elevate" data-testid={`card-provider-${provider.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg" data-testid={`text-provider-name-${provider.id}`}>
                          {provider.name}
                        </CardTitle>
                        {provider.isPrimary && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <CardDescription data-testid={`text-provider-type-${provider.id}`}>
                        {PROVIDER_TYPES.find(t => t.value === provider.providerType)?.label || provider.providerType}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.isActive ? (
                      <Badge variant="default" className="gap-1" data-testid={`badge-status-${provider.id}`}>
                        <Check className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1" data-testid={`badge-status-${provider.id}`}>
                        <X className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                    {provider.transactionFeePercent && (
                      <Badge variant="outline">{provider.transactionFeePercent}% fee</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Currencies:</span>
                      <span className="ml-2 font-medium">
                        {Array.isArray(provider.supportedCurrencies) && provider.supportedCurrencies.length > 0
                          ? provider.supportedCurrencies.join(', ')
                          : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Webhook:</span>
                      <span className="ml-2 font-medium">
                        {provider.webhookUrl ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(provider)}
                      data-testid={`button-edit-${provider.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(provider.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${provider.id}`}
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
