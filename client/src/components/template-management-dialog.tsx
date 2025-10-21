import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CalendarEventTemplate } from "@shared/schema";

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  titleTemplate: z.string().min(1, "Title template is required"),
  descriptionTemplate: z.string().optional(),
  eventType: z.enum(["meeting", "call", "follow_up", "demo", "kyc_review"]),
  defaultDuration: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? 30 : parseInt(String(val), 10),
    z.number().int().min(5, "Duration must be at least 5 minutes").default(30)
  ),
  defaultLocation: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrenceInterval: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? 1 : parseInt(String(val), 10),
    z.number().int().min(1).default(1)
  ),
}).refine(
  (data) => {
    if (data.isRecurring && !data.recurrenceFrequency) {
      return false;
    }
    return true;
  },
  {
    message: "Recurrence frequency is required for recurring templates",
    path: ["recurrenceFrequency"],
  }
);

type TemplateFormData = z.infer<typeof templateFormSchema>;

export function TemplateManagementDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CalendarEventTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery<CalendarEventTemplate[]>({
    queryKey: ["/api/calendar/templates"],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      titleTemplate: "",
      descriptionTemplate: "",
      eventType: "meeting",
      defaultDuration: 30,
      defaultLocation: "",
      isRecurring: false,
      recurrenceFrequency: undefined,
      recurrenceInterval: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      // Build recurrence pattern if recurring AND frequency is set
      const hasValidRecurrence = data.isRecurring && data.recurrenceFrequency;
      const payload: any = {
        ...data,
        // Ensure isRecurring is false if no frequency is provided
        isRecurring: hasValidRecurrence,
        recurrencePattern: hasValidRecurrence ? {
          frequency: data.recurrenceFrequency,
          interval: data.recurrenceInterval,
        } : null,
      };
      // Remove individual recurrence fields as they're now in recurrencePattern
      delete payload.recurrenceFrequency;
      delete payload.recurrenceInterval;
      
      return await apiRequest("POST", "/api/calendar/templates", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/templates"] });
      setIsFormOpen(false);
      form.reset();
      toast({ title: "Template created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create template",
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; values: TemplateFormData }) => {
      // Build recurrence pattern if recurring AND frequency is set
      const hasValidRecurrence = data.values.isRecurring && data.values.recurrenceFrequency;
      const payload: any = {
        ...data.values,
        // Ensure isRecurring is false if no frequency is provided
        isRecurring: hasValidRecurrence,
        recurrencePattern: hasValidRecurrence ? {
          frequency: data.values.recurrenceFrequency,
          interval: data.values.recurrenceInterval,
        } : null,
      };
      // Remove individual recurrence fields as they're now in recurrencePattern
      delete payload.recurrenceFrequency;
      delete payload.recurrenceInterval;
      
      return await apiRequest("PATCH", `/api/calendar/templates/${data.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/templates"] });
      setIsFormOpen(false);
      setEditingTemplate(null);
      form.reset();
      toast({ title: "Template updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update template",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/calendar/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete template",
        variant: "destructive" 
      });
    },
  });

  const handleEdit = (template: CalendarEventTemplate) => {
    setEditingTemplate(template);
    
    // Extract recurrence fields from recurrencePattern
    const pattern = template.recurrencePattern as any;
    form.reset({
      name: template.name,
      description: template.description || "",
      titleTemplate: template.titleTemplate,
      descriptionTemplate: template.descriptionTemplate || "",
      eventType: template.eventType as any,
      defaultDuration: template.defaultDuration,
      defaultLocation: template.defaultLocation || "",
      isRecurring: template.isRecurring || false,
      recurrenceFrequency: pattern?.frequency,
      recurrenceInterval: pattern?.interval || 1,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, values: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    form.reset({
      name: "",
      description: "",
      titleTemplate: "",
      descriptionTemplate: "",
      eventType: "meeting",
      defaultDuration: 30,
      defaultLocation: "",
      isRecurring: false,
      recurrenceFrequency: undefined,
      recurrenceInterval: 1,
    });
    setIsFormOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-manage-templates">
          Manage Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calendar Event Templates</DialogTitle>
          <DialogDescription>
            Create reusable templates for common meeting types
          </DialogDescription>
        </DialogHeader>

        {!isFormOpen ? (
          <div className="space-y-4">
            <Button onClick={handleNewTemplate} className="w-full" data-testid="button-new-template">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates yet. Create your first template to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                    data-testid={`template-item-${template.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground">{template.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Type: {template.eventType} • Duration: {template.defaultDuration} min
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                        data-testid={`button-edit-template-${template.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Weekly Team Sync"
                data-testid="input-template-name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="What this template is for"
                data-testid="input-template-description"
              />
            </div>

            <div>
              <Label htmlFor="titleTemplate">Title Template *</Label>
              <Input
                id="titleTemplate"
                {...form.register("titleTemplate")}
                placeholder="Team Sync - {{date}}"
                data-testid="input-template-title"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{{variables}}'} for dynamic content
              </p>
              {form.formState.errors.titleTemplate && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.titleTemplate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="descriptionTemplate">Description Template</Label>
              <Textarea
                id="descriptionTemplate"
                {...form.register("descriptionTemplate")}
                placeholder="Weekly team sync meeting..."
                data-testid="input-template-description-text"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventType">Event Type *</Label>
                <select
                  id="eventType"
                  {...form.register("eventType")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  data-testid="select-template-type"
                >
                  <option value="meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="demo">Demo</option>
                  <option value="kyc_review">KYC Review</option>
                </select>
              </div>

              <div>
                <Label htmlFor="defaultDuration">Default Duration (minutes) *</Label>
                <Input
                  id="defaultDuration"
                  type="number"
                  {...form.register("defaultDuration")}
                  min="5"
                  data-testid="input-template-duration"
                />
                {form.formState.errors.defaultDuration && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.defaultDuration.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="defaultLocation">Default Location</Label>
              <Input
                id="defaultLocation"
                {...form.register("defaultLocation")}
                placeholder="Meeting room / Zoom URL"
                data-testid="input-template-location"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRecurring"
                {...form.register("isRecurring")}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="checkbox-template-recurring"
              />
              <Label htmlFor="isRecurring" className="font-normal cursor-pointer">
                Recurring Template
              </Label>
            </div>

            {form.watch("isRecurring") && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recurrenceFrequency">Frequency *</Label>
                    <select
                      id="recurrenceFrequency"
                      {...form.register("recurrenceFrequency")}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      data-testid="select-template-frequency"
                    >
                      <option value="">Select frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    {form.formState.errors.recurrenceFrequency && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.recurrenceFrequency.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="recurrenceInterval">Interval *</Label>
                    <Input
                      id="recurrenceInterval"
                      type="number"
                      min="1"
                      {...form.register("recurrenceInterval")}
                      placeholder="1"
                      data-testid="input-template-interval"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingTemplate(null);
                  form.reset();
                }}
                data-testid="button-cancel-template"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-template"
              >
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
