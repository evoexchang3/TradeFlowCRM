import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Eye, Mail, Copy, Send, Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, List } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapUnderline from '@tiptap/extension-underline';
import TiptapLink from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';

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

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onInsertVariable?: (variable: string) => void;
}

function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes to editor (e.g., from variable insertion)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();

  const setLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="border rounded-md">
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleBold}
          data-testid="button-bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleItalic}
          data-testid="button-italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleUnderline}
          data-testid="button-underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleBulletList}
          data-testid="button-bullet-list"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleOrderedList}
          data-testid="button-ordered-list"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('link') ? 'default' : 'ghost'}
          size="sm"
          onClick={setLink}
          data-testid="button-link"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
      </div>
      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none"
        data-testid="rich-text-editor"
      />
    </div>
  );
}

function TemplateForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<z.infer<ReturnType<typeof getTemplateFormSchema>>>;
  onSubmit: (data: z.infer<ReturnType<typeof getTemplateFormSchema>>) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  
  const AVAILABLE_VARIABLES = [
    { key: "{{client_name}}", description: t("emailTemplates.variable.clientName") },
    { key: "{{first_name}}", description: t("emailTemplates.variable.firstName") },
    { key: "{{last_name}}", description: t("emailTemplates.variable.lastName") },
    { key: "{{email}}", description: t("emailTemplates.variable.email") },
    { key: "{{balance}}", description: t("emailTemplates.variable.balance") },
    { key: "{{equity}}", description: t("emailTemplates.variable.equity") },
    { key: "{{account_number}}", description: t("emailTemplates.variable.accountNumber") },
    { key: "{{agent_name}}", description: t("emailTemplates.variable.agentName") },
    { key: "{{company_name}}", description: t("emailTemplates.variable.companyName") },
    { key: "{{support_email}}", description: t("emailTemplates.variable.supportEmail") },
    { key: "{{platform_url}}", description: t("emailTemplates.variable.platformUrl") },
  ];

  const getTemplateFormSchema = () => z.object({
    name: z.string().min(1, t("emailTemplates.validation.nameRequired")),
    subject: z.string().min(1, t("emailTemplates.validation.subjectRequired")),
    body: z.string().min(1, t("emailTemplates.validation.bodyRequired")),
    category: z.enum(["welcome", "verification", "follow_up", "promotion", "kyc", "deposit", "other"]).optional(),
    isActive: z.boolean().default(true),
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<z.infer<ReturnType<typeof getTemplateFormSchema>>>({
    resolver: zodResolver(getTemplateFormSchema()),
    defaultValues: defaultValues || {
      isActive: true,
      category: "other",
      body: "<p>Enter your email content here...</p>",
    },
  });

  const bodyValue = watch("body") || "";

  const insertVariable = (variable: string) => {
    const currentBody = bodyValue;
    // If the body ends with a tag, insert inside it; otherwise append
    if (currentBody.endsWith('</p>')) {
      setValue("body", currentBody.replace(/<\/p>$/, ` ${variable}</p>`), { shouldValidate: true });
    } else {
      setValue("body", currentBody + " " + variable, { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">{t("emailTemplates.templateName")}</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder={t("emailTemplates.templateNamePlaceholder")}
          data-testid="input-template-name"
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="category">{t("emailTemplates.category")}</Label>
        <select
          id="category"
          {...register("category")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-testid="select-template-category"
        >
          <option value="welcome">{t("emailTemplates.category.welcome")}</option>
          <option value="verification">{t("emailTemplates.category.verification")}</option>
          <option value="follow_up">{t("emailTemplates.category.follow_up")}</option>
          <option value="promotion">{t("emailTemplates.category.promotion")}</option>
          <option value="kyc">{t("emailTemplates.category.kyc")}</option>
          <option value="deposit">{t("emailTemplates.category.deposit")}</option>
          <option value="other">{t("emailTemplates.category.other")}</option>
        </select>
      </div>

      <div>
        <Label htmlFor="subject">{t("emailTemplates.emailSubject")}</Label>
        <Input
          id="subject"
          {...register("subject")}
          placeholder={t("emailTemplates.emailSubjectPlaceholder")}
          data-testid="input-template-subject"
        />
        {errors.subject && (
          <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="body">{t("emailTemplates.emailBody")}</Label>
          <div className="text-sm text-muted-foreground">WYSIWYG Editor</div>
        </div>
        <Controller
          name="body"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              content={field.value}
              onChange={(html) => field.onChange(html)}
            />
          )}
        />
        {errors.body && (
          <p className="text-sm text-destructive mt-1">{errors.body.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">{t("emailTemplates.insertVariables")}</Label>
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
            {t("emailTemplates.viewAllVariables")}
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
        <Label htmlFor="isActive">{t("common.active")}</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={isPending}
          data-testid="button-save-template"
        >
          {isPending ? t("common.saving") : t("emailTemplates.saveTemplate")}
        </Button>
      </div>
    </form>
  );
}

function getTemplateFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("emailTemplates.validation.nameRequired")),
    subject: z.string().min(1, t("emailTemplates.validation.subjectRequired")),
    body: z.string().min(1, t("emailTemplates.validation.bodyRequired")),
    category: z.enum(["welcome", "verification", "follow_up", "promotion", "kyc", "deposit", "other"]).optional(),
    isActive: z.boolean().default(true),
  });
}

type TemplateFormData = z.infer<ReturnType<typeof getTemplateFormSchema>>;

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testEmailTemplate, setTestEmailTemplate] = useState<EmailTemplate | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return await apiRequest("POST", "/api/email-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: t("emailTemplates.templateCreated"),
        description: t("emailTemplates.templateCreatedSuccess"),
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("emailTemplates.failedCreate"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      return await apiRequest("PATCH", `/api/email-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: t("emailTemplates.templateUpdated"),
        description: t("emailTemplates.templateUpdatedSuccess"),
      });
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("emailTemplates.failedUpdate"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: t("emailTemplates.templateDeleted"),
        description: t("emailTemplates.templateDeletedSuccess"),
      });
      setDeletingTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("emailTemplates.failedDelete"),
        variant: "destructive",
      });
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ templateId, testEmail }: { templateId: string; testEmail: string }) => {
      return await apiRequest("POST", `/api/email-templates/${templateId}/test`, { testEmail });
    },
    onSuccess: (data: any) => {
      toast({
        title: t("common.success"),
        description: data.message || "Test email sent successfully",
      });
      setTestEmailTemplate(null);
      setTestEmailAddress("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

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

  const handleSendTestEmail = () => {
    if (!testEmailTemplate || !testEmailAddress) return;
    
    sendTestEmailMutation.mutate({
      templateId: testEmailTemplate.id,
      testEmail: testEmailAddress,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-templates-title">{t("emailTemplates.title")}</h1>
          <p className="text-muted-foreground" data-testid="text-templates-description">
            {t("emailTemplates.subtitle")}
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-template">
          <Plus className="w-4 h-4 mr-2" />
          {t("emailTemplates.addTemplate")}
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder={t("emailTemplates.searchPlaceholder")}
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
            <SelectItem value="all">{t("emailTemplates.allCategories")}</SelectItem>
            <SelectItem value="welcome">{t("emailTemplates.category.welcome")}</SelectItem>
            <SelectItem value="verification">{t("emailTemplates.category.verification")}</SelectItem>
            <SelectItem value="follow_up">{t("emailTemplates.category.follow_up")}</SelectItem>
            <SelectItem value="promotion">{t("emailTemplates.category.promotion")}</SelectItem>
            <SelectItem value="kyc">{t("emailTemplates.category.kyc")}</SelectItem>
            <SelectItem value="deposit">{t("emailTemplates.category.deposit")}</SelectItem>
            <SelectItem value="other">{t("emailTemplates.category.other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("emailTemplates.templates")}</CardTitle>
          <CardDescription>
            {filteredTemplates.length !== 1 
              ? t("emailTemplates.templateCountPlural", { count: filteredTemplates.length })
              : t("emailTemplates.templateCount", { count: filteredTemplates.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("emailTemplates.tableHeaderName")}</TableHead>
                <TableHead>{t("emailTemplates.tableHeaderCategory")}</TableHead>
                <TableHead>{t("emailTemplates.tableHeaderSubject")}</TableHead>
                <TableHead>{t("emailTemplates.tableHeaderStatus")}</TableHead>
                <TableHead className="text-right">{t("emailTemplates.tableHeaderActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {t("emailTemplates.loadingTemplates")}
                  </TableCell>
                </TableRow>
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("emailTemplates.noTemplatesFound")}
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
                          {t(`emailTemplates.category.${template.category}`)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{template.subject}</TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setTestEmailTemplate(template);
                            setTestEmailAddress("");
                          }}
                          data-testid={`button-test-email-${template.id}`}
                          title="Send test email"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("emailTemplates.createTemplate")}</DialogTitle>
            <DialogDescription>
              {t("emailTemplates.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <TemplateForm
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("emailTemplates.editTemplate")}</DialogTitle>
              <DialogDescription>
                {t("emailTemplates.editDescription")}
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

      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t("emailTemplates.templatePreview")}</DialogTitle>
              <DialogDescription>
                {t("emailTemplates.previewDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("emailTemplates.subject")}</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  {previewTemplate.subject}
                </div>
              </div>
              <div>
                <Label>{t("emailTemplates.body")}</Label>
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

      {testEmailTemplate && (
        <Dialog open={!!testEmailTemplate} onOpenChange={() => {
          setTestEmailTemplate(null);
          setTestEmailAddress("");
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
              <DialogDescription>
                Send a test email using the "{testEmailTemplate.name}" template with sample data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="testEmail">Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  data-testid="input-test-email-address"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Template variables will be replaced with sample data
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTestEmailTemplate(null);
                    setTestEmailAddress("");
                  }}
                  data-testid="button-cancel-test-email"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleSendTestEmail}
                  disabled={!testEmailAddress || sendTestEmailMutation.isPending}
                  data-testid="button-send-test-email"
                >
                  {sendTestEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={() => setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("emailTemplates.deleteTemplate")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("emailTemplates.deleteConfirm", { name: deletingTemplate?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteMutation.mutate(deletingTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
