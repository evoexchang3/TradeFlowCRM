import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";

const groupFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
  defaultSpread: z.string().optional(),
  defaultLeverage: z.coerce.number().optional(),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

interface SymbolGroup {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  defaultSpread: string | null;
  defaultLeverage: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function TradingSymbolGroupsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SymbolGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<SymbolGroup | null>(null);

  // Fetch symbol groups
  const { data: groups = [], isLoading } = useQuery<SymbolGroup[]>({
    queryKey: ["/api/symbol-groups"],
  });

  // Create group mutation
  const createMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      return await apiRequest("/api/symbol-groups", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbol-groups"] });
      toast({
        title: "Group Created",
        description: "Symbol group has been created successfully.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  // Update group mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GroupFormData> }) => {
      return await apiRequest(`/api/symbol-groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbol-groups"] });
      toast({
        title: "Group Updated",
        description: "Symbol group has been updated successfully.",
      });
      setEditingGroup(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update group",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/symbol-groups/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbol-groups"] });
      toast({
        title: "Group Deleted",
        description: "Symbol group has been deleted successfully.",
      });
      setDeletingGroup(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    },
  });

  const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Symbol Groups
          </h1>
          <p className="text-muted-foreground">
            Organize trading symbols into categories
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-group">
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Symbol Group</DialogTitle>
              <DialogDescription>
                Create a new category for organizing trading symbols
              </DialogDescription>
            </DialogHeader>
            <GroupForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Default Spread</TableHead>
              <TableHead>Default Leverage</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading groups...
                </TableCell>
              </TableRow>
            ) : sortedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FolderOpen className="w-12 h-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No symbol groups yet</p>
                    <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                      Create First Group
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedGroups.map((group) => (
                <TableRow key={group.id} data-testid={`row-group-${group.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {group.displayName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {group.description || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {group.defaultSpread ? `${group.defaultSpread} pips` : "-"}
                  </TableCell>
                  <TableCell>
                    {group.defaultLeverage ? `${group.defaultLeverage}:1` : "-"}
                  </TableCell>
                  <TableCell>{group.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingGroup(group)}
                        data-testid={`button-edit-group-${group.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingGroup(group)}
                        data-testid={`button-delete-group-${group.id}`}
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
      </div>

      {/* Edit Dialog */}
      {editingGroup && (
        <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Symbol Group</DialogTitle>
              <DialogDescription>
                Update the configuration for {editingGroup.name}
              </DialogDescription>
            </DialogHeader>
            <GroupForm
              defaultValues={editingGroup}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingGroup.id, data })
              }
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingGroup}
        onOpenChange={() => setDeletingGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Symbol Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingGroup?.name}? Symbols in this
              group will not be deleted, but will be ungrouped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGroup && deleteMutation.mutate(deletingGroup.id)}
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

// Group Form Component
function GroupForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<GroupFormData>;
  onSubmit: (data: GroupFormData) => void;
  isPending: boolean;
}) {
  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      defaultSpread: "",
      defaultLeverage: 100,
      sortOrder: 0,
      isActive: true,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="forex-majors" {...field} data-testid="input-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name *</FormLabel>
              <FormControl>
                <Input placeholder="Forex Majors" {...field} data-testid="input-display-name" />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Major currency pairs with high liquidity"
                  {...field}
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="defaultSpread"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Spread (pips)</FormLabel>
                <FormControl>
                  <Input placeholder="2.5" {...field} data-testid="input-default-spread" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultLeverage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Leverage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="100"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                    data-testid="input-default-leverage"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  data-testid="input-sort-order"
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
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="w-4 h-4"
                  data-testid="checkbox-is-active"
                />
              </FormControl>
              <FormLabel className="!mt-0">Group is active</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isPending}
            data-testid="button-submit-group"
          >
            {isPending ? "Saving..." : defaultValues ? "Update Group" : "Create Group"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
