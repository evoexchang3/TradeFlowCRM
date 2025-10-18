import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
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

type GroupFormData = {
  name: string;
  displayName: string;
  description?: string;
  defaultSpread?: string;
  defaultLeverage?: number;
  sortOrder: number;
  isActive: boolean;
};

interface SymbolGroup {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  defaultSpread?: string;
  defaultLeverage?: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function TradingSymbolGroupsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SymbolGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<SymbolGroup | null>(null);

  const { data: groups = [], isLoading } = useQuery<SymbolGroup[]>({
    queryKey: ["/api/symbol-groups"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      return await apiRequest("POST", "/api/symbol-groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbol-groups"] });
      toast({
        title: t('symbolGroups.toast.created.title'),
        description: t('symbolGroups.toast.created.description'),
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('symbolGroups.toast.create.failed'),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GroupFormData> }) => {
      return await apiRequest("PATCH", `/api/symbol-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbol-groups"] });
      toast({
        title: t('symbolGroups.toast.updated.title'),
        description: t('symbolGroups.toast.updated.description'),
      });
      setEditingGroup(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('symbolGroups.toast.update.failed'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/symbol-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbol-groups"] });
      toast({
        title: t('symbolGroups.toast.deleted.title'),
        description: t('symbolGroups.toast.deleted.description'),
      });
      setDeletingGroup(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('symbolGroups.toast.delete.failed'),
        variant: "destructive",
      });
    },
  });

  const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {t('symbolGroups.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('symbolGroups.subtitle')}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-group">
              <Plus className="w-4 h-4 mr-2" />
              {t('symbolGroups.add.group')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('symbolGroups.add.new.title')}</DialogTitle>
              <DialogDescription>
                {t('symbolGroups.add.new.description')}
              </DialogDescription>
            </DialogHeader>
            <GroupForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('symbolGroups.table.name')}</TableHead>
              <TableHead>{t('symbolGroups.table.description')}</TableHead>
              <TableHead>{t('symbolGroups.table.default.spread')}</TableHead>
              <TableHead>{t('symbolGroups.table.default.leverage')}</TableHead>
              <TableHead>{t('symbolGroups.table.order')}</TableHead>
              <TableHead>{t('symbolGroups.table.status')}</TableHead>
              <TableHead className="text-right">{t('symbolGroups.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {t('symbolGroups.loading')}
                </TableCell>
              </TableRow>
            ) : sortedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FolderOpen className="w-12 h-12 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('symbolGroups.empty.title')}</p>
                    <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                      {t('symbolGroups.empty.button')}
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
                    {group.defaultSpread ? `${group.defaultSpread} ${t('symbolGroups.pips')}` : "-"}
                  </TableCell>
                  <TableCell>
                    {group.defaultLeverage ? `${group.defaultLeverage}${t('symbolGroups.leverage.ratio')}` : "-"}
                  </TableCell>
                  <TableCell>{group.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? t('common.active') : t('common.inactive')}
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

      {editingGroup && (
        <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('symbolGroups.edit.title')}</DialogTitle>
              <DialogDescription>
                {t('symbolGroups.edit.description', { name: editingGroup.name })}
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

      <AlertDialog
        open={!!deletingGroup}
        onOpenChange={() => setDeletingGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('symbolGroups.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('symbolGroups.delete.description', { name: deletingGroup?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGroup && deleteMutation.mutate(deletingGroup.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<GroupFormData>;
  onSubmit: (data: GroupFormData) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();

  const groupFormSchema = z.object({
    name: z.string().min(1, t('symbolGroups.validation.name.required')),
    displayName: z.string().min(1, t('symbolGroups.validation.display.name.required')),
    description: z.string().optional(),
    defaultSpread: z.string().optional(),
    defaultLeverage: z.coerce.number().optional(),
    sortOrder: z.coerce.number().default(0),
    isActive: z.boolean().default(true),
  });

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
              <FormLabel>{t('symbolGroups.form.name.label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('symbolGroups.form.name.placeholder')} {...field} data-testid="input-name" />
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
              <FormLabel>{t('symbolGroups.form.display.name.label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('symbolGroups.form.display.name.placeholder')} {...field} data-testid="input-display-name" />
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
              <FormLabel>{t('symbolGroups.form.description.label')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('symbolGroups.form.description.placeholder')}
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
                <FormLabel>{t('symbolGroups.form.default.spread.label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('symbolGroups.form.default.spread.placeholder')} {...field} data-testid="input-default-spread" />
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
                <FormLabel>{t('symbolGroups.form.default.leverage.label')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t('symbolGroups.form.default.leverage.placeholder')}
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
              <FormLabel>{t('symbolGroups.form.display.order.label')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t('symbolGroups.form.display.order.placeholder')}
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
              <FormLabel className="!mt-0">{t('symbolGroups.form.is.active.label')}</FormLabel>
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
            {isPending ? t('common.saving') : defaultValues ? t('symbolGroups.form.update.button') : t('symbolGroups.form.create.button')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
