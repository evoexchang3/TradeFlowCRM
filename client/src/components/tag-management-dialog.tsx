import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tags, Pencil, Trash2, Plus } from "lucide-react";
import type { PositionTag } from "@shared/schema";

const tagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  description: z.string().max(200, "Description must be 200 characters or less").optional(),
});

type TagFormData = z.infer<typeof tagSchema>;

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
];

interface TagManagementDialogProps {
  trigger?: React.ReactNode;
}

export function TagManagementDialog({ trigger }: TagManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<PositionTag | null>(null);
  const { toast } = useToast();

  const { data: tags = [], isLoading } = useQuery<PositionTag[]>({
    queryKey: ["/api/position-tags"],
    enabled: open,
  });

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TagFormData) => {
      return await apiRequest("POST", "/api/position-tags", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/position-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({ title: "Tag created successfully" });
      form.reset();
      setEditingTag(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TagFormData> }) => {
      return await apiRequest("PATCH", `/api/position-tags/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/position-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({ title: "Tag updated successfully" });
      form.reset();
      setEditingTag(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/position-tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/position-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({ title: "Tag deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TagFormData) => {
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (tag: PositionTag) => {
    setEditingTag(tag);
    form.reset({
      name: tag.name,
      color: tag.color,
      description: tag.description || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    form.reset({
      name: "",
      color: "#3b82f6",
      description: "",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this tag? It will be removed from all positions.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-manage-tags">
            <Tags className="h-4 w-4 mr-2" />
            Manage Tags
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-tag-management">
        <DialogHeader>
          <DialogTitle>Manage Position Tags</DialogTitle>
          <DialogDescription>
            Create and manage tags to categorize your trading positions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tag Form */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">
              {editingTag ? "Edit Tag" : "Create New Tag"}
            </h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., High Priority, Long Term, Scalping"
                          {...field}
                          data-testid="input-tag-name"
                        />
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
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              {...field}
                              className="w-20 h-10"
                              data-testid="input-tag-color"
                            />
                            <Input
                              type="text"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="#3b82f6"
                              className="flex-1"
                              data-testid="input-tag-color-hex"
                            />
                            <Badge
                              style={{ backgroundColor: field.value }}
                              className="text-white"
                              data-testid="badge-tag-preview"
                            >
                              Preview
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => field.onChange(color)}
                                className="w-8 h-8 rounded border-2 border-transparent hover:border-foreground transition-colors"
                                style={{ backgroundColor: color }}
                                data-testid={`button-preset-color-${color}`}
                              />
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of this tag's purpose"
                          {...field}
                          data-testid="input-tag-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-tag"
                  >
                    {editingTag ? "Update Tag" : "Create Tag"}
                  </Button>
                  {editingTag && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>

          {/* Existing Tags List */}
          <div>
            <h3 className="text-sm font-medium mb-3">Existing Tags ({tags.length})</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading tags...</p>
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags created yet</p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    data-testid={`tag-item-${tag.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge
                        style={{ backgroundColor: tag.color }}
                        className="text-white shrink-0"
                        data-testid={`badge-tag-${tag.id}`}
                      >
                        {tag.name}
                      </Badge>
                      {tag.description && (
                        <span className="text-sm text-muted-foreground truncate">
                          {tag.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tag)}
                        data-testid={`button-edit-tag-${tag.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tag.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-tag-${tag.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
