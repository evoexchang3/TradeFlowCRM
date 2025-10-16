import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, ArrowRight } from "lucide-react";

const EUROPEAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'cs', name: 'Czech (Čeština)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'ro', name: 'Romanian (Română)' },
  { code: 'hu', name: 'Hungarian (Magyar)' },
  { code: 'bg', name: 'Bulgarian (Български)' },
  { code: 'da', name: 'Danish (Dansk)' },
  { code: 'fi', name: 'Finnish (Suomi)' },
  { code: 'sk', name: 'Slovak (Slovenčina)' },
  { code: 'no', name: 'Norwegian (Norsk)' },
  { code: 'hr', name: 'Croatian (Hrvatski)' },
  { code: 'sr', name: 'Serbian (Српски)' },
  { code: 'cnr', name: 'Montenegrin (Crnogorski)' },
  { code: 'lt', name: 'Lithuanian (Lietuvių)' },
  { code: 'sl', name: 'Slovenian (Slovenščina)' },
  { code: 'lv', name: 'Latvian (Latviešu)' },
  { code: 'et', name: 'Estonian (Eesti)' },
  { code: 'ga', name: 'Irish (Gaeilge)' },
  { code: 'mt', name: 'Maltese (Malti)' },
  { code: 'sq', name: 'Albanian (Shqip)' },
  { code: 'mk', name: 'Macedonian (Македонски)' },
  { code: 'bs', name: 'Bosnian (Bosanski)' },
  { code: 'is', name: 'Icelandic (Íslenska)' },
  { code: 'lb', name: 'Luxembourgish (Lëtzebuergesch)' },
  { code: 'ca', name: 'Catalan (Català)' },
  { code: 'eu', name: 'Basque (Euskara)' },
  { code: 'gl', name: 'Galician (Galego)' },
  { code: 'cy', name: 'Welsh (Cymraeg)' },
  { code: 'be', name: 'Belarusian (Беларуская)' },
  { code: 'uk', name: 'Ukrainian (Українська)' },
  { code: 'fo', name: 'Faroese (Føroyskt)' },
  { code: 'rm', name: 'Romansh (Rumantsch)' },
  { code: 'gd', name: 'Scottish Gaelic (Gàidhlig)' },
  { code: 'br', name: 'Breton (Brezhoneg)' },
  { code: 'kw', name: 'Cornish (Kernewek)' },
  { code: 'gv', name: 'Manx (Gaelg)' },
  { code: 'hy', name: 'Armenian (Հայերեն)' },
  { code: 'ka', name: 'Georgian (ქართული)' },
  { code: 'az', name: 'Azerbaijani (Azərbaycan)' },
  { code: 'kk', name: 'Kazakh (Қазақша)' },
  { code: 'oc', name: 'Occitan (Occitan)' },
  { code: 'sc', name: 'Sardinian (Sardu)' },
  { code: 'co', name: 'Corsican (Corsu)' },
  { code: 'fur', name: 'Friulian (Furlan)' },
  { code: 'hsb', name: 'Upper Sorbian (Hornjoserbšćina)' },
  { code: 'dsb', name: 'Lower Sorbian (Dolnoserbski)' },
  { code: 'fy', name: 'West Frisian (Frysk)' },
  { code: 'se', name: 'Northern Sámi (Davvisámegiella)' },
];

const routingRuleSchema = z.object({
  salesTeamId: z.string().min(1, "Sales team is required"),
  retentionTeamId: z.string().min(1, "Retention team is required"),
  languageCode: z.string().min(1, "Language is required"),
  isActive: z.boolean().default(true),
});

type RoutingRuleFormData = z.infer<typeof routingRuleSchema>;

export default function TeamRouting() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: rules = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/team-routing-rules'],
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const salesTeams = teams.filter((t: any) => t.department === 'sales');
  const retentionTeams = teams.filter((t: any) => t.department === 'retention');

  const form = useForm<RoutingRuleFormData>({
    resolver: zodResolver(routingRuleSchema),
    defaultValues: {
      salesTeamId: "",
      retentionTeamId: "",
      languageCode: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/team-routing-rules', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-routing-rules'] });
      toast({ title: "Success", description: "Routing rule created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/team-routing-rules/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-routing-rules'] });
      toast({ title: "Success", description: "Routing rule updated successfully" });
      setEditingRule(null);
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/team-routing-rules/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-routing-rules'] });
      toast({ title: "Success", description: "Routing rule deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: RoutingRuleFormData) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    form.reset({
      salesTeamId: rule.salesTeamId,
      retentionTeamId: rule.retentionTeamId,
      languageCode: rule.languageCode,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingRule(null);
      form.reset();
    }
  };

  const confirmDelete = () => {
    if (deletingRuleId) {
      deleteMutation.mutate(deletingRuleId);
      setDeletingRuleId(null);
    }
  };

  const getLanguageName = (code: string) => {
    return EUROPEAN_LANGUAGES.find(l => l.code === code)?.name || code;
  };

  const getTeamName = (id: string) => {
    return teams.find((t: any) => t.id === id)?.name || 'Unknown Team';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-team-routing-title">Team Routing Rules</h1>
          <p className="text-muted-foreground">Configure automatic client transfers from sales to retention teams by language</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-routing-rule">
              <Plus className="h-4 w-4 mr-2" />
              Add Routing Rule
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-routing-rule-form">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit Routing Rule" : "Create New Routing Rule"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="languageCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EUROPEAN_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
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
                  name="salesTeamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Team (From)</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sales-team">
                            <SelectValue placeholder="Select sales team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salesTeams.map((team: any) => (
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
                  name="retentionTeamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retention Team (To)</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-retention-team">
                            <SelectValue placeholder="Select retention team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {retentionTeams.map((team: any) => (
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable this routing rule for automatic transfers
                        </div>
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
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleDialogClose(false)}
                    data-testid="button-cancel-routing-rule"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-routing-rule"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-routing-rules">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-routing-rules">
              <p className="text-muted-foreground">No routing rules configured</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create a routing rule to automatically transfer clients from sales to retention teams when they make their first deposit
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Language</TableHead>
                  <TableHead>Sales Team</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Retention Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule: any) => (
                  <TableRow key={rule.id} data-testid={`row-routing-rule-${rule.id}`}>
                    <TableCell>
                      <Badge variant="outline" className="font-normal" data-testid={`text-language-${rule.id}`}>
                        {getLanguageName(rule.languageCode)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-sales-team-${rule.id}`}>
                      {getTeamName(rule.salesTeamId)}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-retention-team-${rule.id}`}>
                      {getTeamName(rule.retentionTeamId)}
                    </TableCell>
                    <TableCell>
                      {rule.isActive ? (
                        <Badge variant="default" data-testid={`badge-active-${rule.id}`}>
                          <span data-testid={`text-status-${rule.id}`}>Active</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-inactive-${rule.id}`}>
                          <span data-testid={`text-status-${rule.id}`}>Inactive</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rule)}
                          data-testid={`button-edit-${rule.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingRuleId(rule.id)}
                          data-testid={`button-delete-${rule.id}`}
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

      <AlertDialog open={!!deletingRuleId} onOpenChange={(open) => !open && setDeletingRuleId(null)}>
        <AlertDialogContent data-testid="dialog-delete-routing-rule">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">Delete Routing Rule</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              Are you sure you want to delete this routing rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
