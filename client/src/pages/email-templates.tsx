import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Eye, Mail, Copy } from "lucide-react";

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  category: z.enum(["welcome", "verification", "follow_up", "promotion", "kyc", "deposit", "other"]).optional(),
  isActive: z.boolean().default(true),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: "welcome" | "verification" | "follow_up" | "promotion" | "kyc" | "deposit" | "other";
  variables?: string[];
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Common variables that can be used in templates
const AVAILABLE_VARIABLES = [
  { key: "{{client_name}}", description: "Client's full name" },
  { key: "{{first_name}}", description: "Client's first name" },
  { key: "{{last_name}}", description: "Client's last name" },
  { key: "{{email}}", description: "Client's email" },
  { key: "{{balance}}", description: "Account balance" },
  { key: "{{equity}}", description: "Account equity" },
  { key: "{{account_number}}", description: "Account number" },
  { key: "{{agent_name}}", description: "Assigned agent name" },
  { key: "{{company_name}}", description: "Company name" },
  { key: "{{support_email}}", description: "Support email" },
  { key: "{{platform_url}}", description: "Platform URL" },
];

function TemplateForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<TemplateFormData>;
  onSubmit: (data: TemplateFormData) => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: defaultValues || {
      isActive: true,
      category: "other",
    },
  });

  const bodyValue = watch("body") || "";

  const insertVariable = (variable: string) => {
    const currentBody = bodyValue;
    setValue("body", currentBody + " " + variable);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g., Welcome Email"
          data-testid="input-template-name"
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          {...register("category")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-testid="select-template-category"
        >
          <option value="welcome">Welcome</option>
          <option value="verification">Verification</option>
          <option value="follow_up">Follow Up</option>
          <option value="promotion">Promotion</option>
          <option value="kyc">KYC</option>
          <option value="deposit">Deposit</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <Label htmlFor="subject">Email Subject</Label>
        <Input
          id="subject"
          {...register("subject")}
          placeholder="Email subject line"
          data-testid="input-template-subject"
        />
        {errors.subject && (
          <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="body">Email Body</Label>
          <div className="text-sm text-muted-foreground">HTML supported</div>
        </div>
        <Textarea
          id="body"
          {...register("body")}
          placeholder="Email body content (HTML supported)"
          className="min-h-[200px] font-mono text-sm"
          data-testid="input-template-body"
        />
        {errors.body && (
          <p className="text-sm text-destructive mt-1">{errors.body.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Insert Variables</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.slice(0, 6).map((variable) => (
            <Button
              key={variable.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable(variable.key)}
              data-testid={`button-insert-${variable.key.replace(/[{}]/g, '')}`}
            >
              <Copy className="w-3 h-3 mr-1" />
              {variable.key}
            </Button>
          ))}
        </div>
        <details className="mt-2">
          <summary className="text-sm text-muted-foreground cursor-pointer">
            View all available variables
          </summary>
          <div className="mt-2 space-y-1 text-sm">
            {AVAILABLE_VARIABLES.map((variable) => (
              <div key={variable.key} className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded">{variable.key}</code>
                <span className="text-muted-foreground">- {variable.description}</span>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="isActive"
          checked={watch("isActive")}
          onCheckedChange={(checked) => setValue("isActive", checked)}
          data-testid="switch-template-active"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={isPending}
          data-testid="button-save-template"
        >
          {isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </form>
  );
}

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return await apiRequest("POST", "/api/email-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Template Created",
        description: "Email template has been created successfully.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      return await apiRequest("PATCH", `/api/email-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Template Updated",
        description: "Email template has been updated successfully.",
      });
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Template Deleted",
        description: "Email template has been deleted successfully.",
      });
      setDeletingTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    if (categoryFilter !== "all" && template.category !== categoryFilter) return false;
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !template.subject.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      welcome: "bg-blue-500/10 text-blue-500",
      verification: "bg-green-500/10 text-green-500",
      follow_up: "bg-yellow-500/10 text-yellow-500",
      promotion: "bg-purple-500/10 text-purple-500",
      kyc: "bg-orange-500/10 text-orange-500",
      deposit: "bg-teal-500/10 text-teal-500",
      other: "bg-gray-500/10 text-gray-500",
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  // Preview with sample data
  const getPreviewContent = (template: EmailTemplate) => {
    let previewBody = template.body;
    const sampleData = {
      "{{client_name}}": "John Doe",
      "{{first_name}}": "John",
      "{{last_name}}": "Doe",
      "{{email}}": "john.doe@example.com",
      "{{balance}}": "$10,000.00",
      "{{equity}}": "$10,500.00",
      "{{account_number}}": "MT5-123456",
      "{{agent_name}}": "Sarah Johnson",
      "{{company_name}}": "Trading Platform CRM",
      "{{support_email}}": "support@tradingcrm.com",
      "{{platform_url}}": "https://platform.tradingcrm.com",
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      previewBody = previewBody.replace(new RegExp(key, 'g'), value);
    });

    return previewBody;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-templates-title">Email Templates</h1>
          <p className="text-muted-foreground" data-testid="text-templates-description">
            Manage email templates for client communication
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-template">
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-templates"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="welcome">Welcome</SelectItem>
            <SelectItem value="verification">Verification</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
            <SelectItem value="promotion">Promotion</SelectItem>
            <SelectItem value="kyc">KYC</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading templates...
                  </TableCell>
                </TableRow>
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No templates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium" data-testid={`text-template-name-${template.id}`}>
                          {template.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.category && (
                        <Badge variant="outline" className={getCategoryColor(template.category)}>
                          {template.category.replace('_', ' ')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{template.subject}</TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPreviewTemplate(template)}
                          data-testid={`button-preview-template-${template.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingTemplate(template)}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingTemplate(template)}
                          data-testid={`button-delete-template-${template.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Create a new email template for client communication
            </DialogDescription>
          </DialogHeader>
          <TemplateForm
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Email Template</DialogTitle>
              <DialogDescription>
                Update template details
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              defaultValues={editingTemplate}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingTemplate.id, data })
              }
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                Preview with sample data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Subject:</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  {previewTemplate.subject}
                </div>
              </div>
              <div>
                <Label>Body:</Label>
                <div 
                  className="mt-1 p-4 bg-muted rounded-md prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: getPreviewContent(previewTemplate) }}
                  data-testid="preview-template-body"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={() => setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteMutation.mutate(deletingTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
