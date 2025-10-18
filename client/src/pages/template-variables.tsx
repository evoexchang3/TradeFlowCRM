import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Code, Copy, Check, Trash2, Edit } from "lucide-react";
import * as z from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

interface TemplateVariable {
  id: string;
  name: string;
  variableKey: string;
  description: string | null;
  category: string;
  defaultValue: string | null;
  isSystem: boolean;
  createdAt: string;
}

function VariableCard({ variable }: { variable: TemplateVariable }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`{{${variable.variableKey}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base" data-testid={`text-variable-${variable.id}`}>
                {variable.name}
              </CardTitle>
              {variable.isSystem && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t('templateVariables.system')}</span>
              )}
            </div>
            <CardDescription className="text-xs mt-1">
              {variable.category}
              {variable.description && ` • ${variable.description}`}
            </CardDescription>
            <div className="flex items-center gap-2 mt-3">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {`{{${variable.variableKey}}}`}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={copyToClipboard}
                data-testid={`button-copy-${variable.id}`}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            {variable.defaultValue && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('templateVariables.default')} {variable.defaultValue}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function TemplateVariables() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const { t } = useLanguage();

  const variableFormSchema = z.object({
    name: z.string().min(1, t('templateVariables.validation.nameRequired')),
    variableKey: z.string().min(1, t('templateVariables.validation.keyRequired')),
    description: z.string().optional(),
    category: z.string(),
    defaultValue: z.string().optional(),
    isSystem: z.boolean().default(false),
  });

  type VariableFormData = z.infer<typeof variableFormSchema>;

  const { data: variables = [], isLoading } = useQuery<TemplateVariable[]>({
    queryKey: ['/api/template-variables'],
  });

  const form = useForm<VariableFormData>({
    resolver: zodResolver(variableFormSchema),
    defaultValues: {
      name: "",
      variableKey: "",
      description: "",
      category: "client",
      defaultValue: "",
      isSystem: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: VariableFormData) => apiRequest('/api/template-variables', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/template-variables'] });
      toast({ title: t('templateVariables.toast.created.title'), description: t('templateVariables.toast.created.description') });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: t('templateVariables.toast.error.title'), description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: VariableFormData) => {
    createMutation.mutate(data);
  };

  const filteredVariables = selectedCategory === "all"
    ? variables
    : variables.filter(v => v.category === selectedCategory);

  const categories = Array.from(new Set(variables.map(v => v.category)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">{t('templateVariables.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('templateVariables.title')}</h1>
          <p className="text-muted-foreground">{t('templateVariables.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-variable">
              <Plus className="h-4 w-4 mr-2" />
              {t('templateVariables.addVariable')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('templateVariables.createNew')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('templateVariables.variableName')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('templateVariables.variableName.placeholder')} data-testid="input-variable-name" />
                      </FormControl>
                      <FormDescription>
                        {t('templateVariables.variableName.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="variableKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('templateVariables.variableKey')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('templateVariables.variableKey.placeholder')}
                          data-testid="input-variable-key"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('templateVariables.variableKey.description', { key: field.value || 'key' })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('templateVariables.category')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="client">{t('templateVariables.category.client')}</SelectItem>
                          <SelectItem value="account">{t('templateVariables.category.account')}</SelectItem>
                          <SelectItem value="trading">{t('templateVariables.category.trading')}</SelectItem>
                          <SelectItem value="agent">{t('templateVariables.category.agent')}</SelectItem>
                          <SelectItem value="system">{t('templateVariables.category.system')}</SelectItem>
                          <SelectItem value="custom">{t('templateVariables.category.custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('templateVariables.description.optional')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('templateVariables.description.placeholder')}
                          data-testid="input-description"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('templateVariables.defaultValue')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('templateVariables.defaultValue.placeholder')}
                          data-testid="input-default-value"
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
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? t('templateVariables.creating') : t('templateVariables.createVariable')}
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
            <SelectValue placeholder={t('templateVariables.filterByCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('templateVariables.allCategories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)} {t('common.type')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filteredVariables.length !== 1
            ? t('templateVariables.variableCountPlural', { count: filteredVariables.length })
            : t('templateVariables.variableCount', { count: filteredVariables.length })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVariables.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="p-6 text-center text-muted-foreground">
              {selectedCategory === "all"
                ? t('templateVariables.noVariables')
                : t('templateVariables.noVariablesInCategory')}
            </CardContent>
          </Card>
        ) : (
          filteredVariables.map((variable) => (
            <VariableCard key={variable.id} variable={variable} />
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('templateVariables.usageExample')}</CardTitle>
          <CardDescription>{t('templateVariables.usageExample.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md font-mono text-sm space-y-2">
            <p>{t('templateVariables.usageExample.hi')}</p>
            <p className="mt-2">
              {t('templateVariables.usageExample.account')}
            </p>
            <p className="mt-2">
              {t('templateVariables.usageExample.balance')}
            </p>
            <p className="mt-4">{t('templateVariables.usageExample.regards')}<br />{`{{agent.name}}`}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
