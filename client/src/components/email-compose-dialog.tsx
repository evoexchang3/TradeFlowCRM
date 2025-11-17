import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, FileText, X } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapUnderline from '@tiptap/extension-underline';
import TiptapLink from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Badge } from "@/components/ui/badge";

interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    country?: string;
  };
}

export function EmailComposeDialog({ open, onOpenChange, client }: EmailComposeDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>('');
  const [useTemplate, setUseTemplate] = useState(false);

  // Fetch SMTP settings
  const { data: smtpSettings = [] } = useQuery<any[]>({
    queryKey: ['/api/smtp-settings'],
  });

  // Fetch email templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['/api/email-templates'],
  });

  // Get active SMTP settings
  const activeSmtp = smtpSettings.find(s => s.isActive);

  // Rich text editor
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
    content: body,
    onUpdate: ({ editor }) => {
      setBody(editor.getHTML());
    },
  });

  // Sync body to editor when it changes externally (template selection)
  useEffect(() => {
    if (editor && body !== editor.getHTML()) {
      editor.commands.setContent(body);
    }
  }, [body, editor]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (!templateId) {
      setSubject('');
      setBody('');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Replace template variables with client data
      const variables: Record<string, string> = {
        client_name: `${client.firstName} ${client.lastName}`,
        client_first_name: client.firstName,
        client_last_name: client.lastName,
        client_email: client.email,
        client_phone: client.phone || '',
        client_country: client.country || '',
      };

      let populatedSubject = template.subject;
      let populatedBody = template.body;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        populatedSubject = populatedSubject.replace(new RegExp(placeholder, 'g'), value);
        populatedBody = populatedBody.replace(new RegExp(placeholder, 'g'), value);
      }

      setSubject(populatedSubject);
      setBody(populatedBody);
    }
  };

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/clients/${client.id}/send-email`, {
        subject,
        body,
        templateId: useTemplate ? selectedTemplateId : undefined,
        smtpSettingId: selectedSmtpId || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', client.id, 'comments'] });
      toast({
        title: t('common.success'),
        description: 'Email sent successfully',
      });
      onOpenChange(false);
      // Reset form
      setSubject('');
      setBody('');
      setSelectedTemplateId('');
      setUseTemplate(false);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to send email',
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!subject.trim()) {
      toast({
        title: t('common.error'),
        description: 'Subject is required',
        variant: "destructive",
      });
      return;
    }
    if (!body.trim()) {
      toast({
        title: t('common.error'),
        description: 'Email body is required',
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate();
  };

  const availableVariables = [
    '{{client_name}}',
    '{{client_first_name}}',
    '{{client_last_name}}',
    '{{client_email}}',
    '{{client_phone}}',
    '{{client_country}}',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to {client.firstName} {client.lastName}
          </DialogTitle>
          <DialogDescription>
            Compose and send an email using your configured SMTP account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="bg-muted p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">To:</Label>
              <span className="text-sm">{client.email}</span>
            </div>
          </div>

          {/* SMTP Account Selector */}
          {smtpSettings.length > 0 && (
            <div>
              <Label>SMTP Account</Label>
              <Select value={selectedSmtpId} onValueChange={setSelectedSmtpId}>
                <SelectTrigger data-testid="select-smtp-account">
                  <SelectValue placeholder={activeSmtp ? `${activeSmtp.fromName} <${activeSmtp.fromEmail}>` : 'Select SMTP account'} />
                </SelectTrigger>
                <SelectContent>
                  {smtpSettings.filter(s => s.isActive).map((smtp) => (
                    <SelectItem key={smtp.id} value={smtp.id}>
                      {smtp.fromName} &lt;{smtp.fromEmail}&gt;
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs value={useTemplate ? 'template' : 'compose'} onValueChange={(v) => setUseTemplate(v === 'template')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="template">Use Template</TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-4">
              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  data-testid="input-email-subject"
                />
              </div>

              {/* Body Editor */}
              <div>
                <Label>Email Body</Label>
                <div className="border rounded-md">
                  <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant={editor?.isActive('bold') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      className="h-8 w-8 p-0"
                    >
                      <strong>B</strong>
                    </Button>
                    <Button
                      type="button"
                      variant={editor?.isActive('italic') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      className="h-8 w-8 p-0"
                    >
                      <em>I</em>
                    </Button>
                    <Button
                      type="button"
                      variant={editor?.isActive('underline') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => editor?.chain().focus().toggleUnderline().run()}
                      className="h-8 w-8 p-0"
                    >
                      <u>U</u>
                    </Button>
                  </div>
                  <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 min-h-[200px]" />
                </div>
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Available Variables:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {availableVariables.map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          editor?.commands.insertContent(variable);
                        }}
                      >
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="template" className="space-y-4">
              {/* Template Selector */}
              <div>
                <Label>Select Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger data-testid="select-email-template">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.isActive).map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              {selectedTemplateId && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Subject Preview:</Label>
                    <div className="bg-muted p-2 rounded text-sm mt-1">{subject}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Body Preview:</Label>
                    <div 
                      className="bg-muted p-3 rounded text-sm mt-1 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: body }}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-email">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sendEmailMutation.isPending || !subject || !body}
            data-testid="button-send-email"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
