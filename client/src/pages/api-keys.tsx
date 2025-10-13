import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Key, Copy, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertApiKeySchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

// Form schema for API key creation (excludes server-set fields)
const apiKeyFormSchema = z.object({
  name: z.string().min(1, "API key name is required"),
  scope: z.enum(['read', 'write', 'admin']),
  ipWhitelist: z.string().optional(),
  expiresAt: z.string().optional(),
});

type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

export default function ApiKeys() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: '',
      scope: 'read',
      ipWhitelist: '',
      expiresAt: '',
    },
  });

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['/api/admin/api-keys'],
  });

  const createMutation = useMutation({
    mutationFn: (data: ApiKeyFormValues) => {
      const payload: any = {
        name: data.name,
        scope: data.scope,
      };

      if (data.ipWhitelist) {
        payload.ipWhitelist = data.ipWhitelist.split(',').map(ip => ip.trim()).filter(Boolean);
      }

      if (data.expiresAt) {
        payload.expiresAt = new Date(data.expiresAt).toISOString();
      }

      return apiRequest('POST', '/api/admin/api-keys', payload);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      setNewApiKey(response.key);
      toast({ title: "API key created successfully" });
      form.reset();
    },
    onError: (error: any) => {
      const errorMessage = error.details 
        ? `Validation error: ${error.details.map((d: any) => d.message).join(', ')}`
        : error.error || 'Failed to create API key';
      toast({ 
        title: "Error creating API key", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      toast({ title: "API key revoked successfully" });
      setDeleteKeyId(null);
    },
  });

  const onSubmit = (data: ApiKeyFormValues) => {
    createMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'read': return 'default';
      case 'write': return 'default';
      case 'admin': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'revoked': return 'secondary';
      case 'expired': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-apikeys-title">API Key Management</h1>
          <p className="text-sm text-muted-foreground">
            Generate and manage API keys for external platform integrations
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-apikey" className="hover-elevate active-elevate-2">
              <Plus className="h-4 w-4 mr-2" />
              Generate API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for external platform integration. The key will only be shown once.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Production Server"
                          data-testid="input-apikey-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-apikey-scope">
                            <SelectValue placeholder="Select scope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                          <SelectItem value="admin">Full Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ipWhitelist"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP Whitelist (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 192.168.1.1, 10.0.0.1"
                          data-testid="input-apikey-ipwhitelist"
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated IP addresses. Leave empty to allow all IPs.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expires At (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          data-testid="input-apikey-expiresat"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full hover-elevate active-elevate-2"
                  data-testid="button-submit-apikey"
                >
                  {createMutation.isPending ? 'Generating...' : 'Generate API Key'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {newApiKey && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Save Your API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This is the only time you'll see this key. Copy it now and store it securely.
            </p>
            <div className="flex gap-2">
              <Input
                value={newApiKey}
                readOnly
                className="font-mono text-sm"
                data-testid="input-new-apikey-value"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(newApiKey)}
                data-testid="button-copy-apikey"
                className="hover-elevate active-elevate-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => {
                setNewApiKey(null);
                setIsCreateOpen(false);
              }}
              variant="outline"
              className="w-full hover-elevate active-elevate-2"
              data-testid="button-dismiss-apikey"
            >
              I've Saved My Key
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading API keys...</div>
      ) : !apiKeys || !Array.isArray(apiKeys) || apiKeys.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No API keys created yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate your first API key to enable external platform integrations
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(apiKeys as any[]).map((key: any) => (
            <Card key={key.id} data-testid={`card-apikey-${key.id}`} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium" data-testid={`text-apikey-name-${key.id}`}>{key.name}</h3>
                      <Badge variant={getScopeColor(key.scope)} data-testid={`badge-apikey-scope-${key.id}`}>
                        {key.scope}
                      </Badge>
                      <Badge variant={getStatusColor(key.status)} data-testid={`badge-apikey-status-${key.id}`}>
                        {key.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono" data-testid={`text-apikey-prefix-${key.id}`}>{key.keyPrefix}...</span>
                      <span data-testid={`text-apikey-createdat-${key.id}`}>
                        Created {format(new Date(key.createdAt), 'MMM d, yyyy')}
                      </span>
                      {key.expiresAt && (
                        <span data-testid={`text-apikey-expiresat-${key.id}`}>
                          Expires {format(new Date(key.expiresAt), 'MMM d, yyyy')}
                        </span>
                      )}
                      {key.lastUsedAt && (
                        <span data-testid={`text-apikey-lastusedat-${key.id}`}>
                          Last used {format(new Date(key.lastUsedAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    {key.ipWhitelist && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-apikey-ipwhitelist-${key.id}`}>
                        IP Whitelist: {key.ipWhitelist.join(', ')}
                      </p>
                    )}
                  </div>
                  {key.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteKeyId(key.id)}
                      data-testid={`button-revoke-apikey-${key.id}`}
                      className="hover-elevate active-elevate-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke the API key. Any applications using this key will no longer be able to authenticate.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyId && deleteMutation.mutate(deleteKeyId)}
              data-testid="button-confirm-revoke"
              className="hover-elevate active-elevate-2"
            >
              {deleteMutation.isPending ? 'Revoking...' : 'Revoke Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
