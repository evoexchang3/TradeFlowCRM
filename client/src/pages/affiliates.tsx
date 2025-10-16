import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Users, DollarSign } from "lucide-react";

const affiliateFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  commissionRate: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Commission rate must be a positive number",
  }),
  paymentMethod: z.string().optional(),
  status: z.enum(["active", "suspended", "inactive"]).default("active"),
});

type AffiliateFormData = z.infer<typeof affiliateFormSchema>;

interface Affiliate {
  id: string;
  code: string;
  name: string;
  email: string;
  commissionRate: string;
  paymentMethod?: string;
  status: string;
  createdAt: string;
}

function AffiliateForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<AffiliateFormData>;
  onSubmit: (data: AffiliateFormData) => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AffiliateFormData>({
    resolver: zodResolver(affiliateFormSchema),
    defaultValues: defaultValues || {
      status: "active",
      commissionRate: "10.00",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Affiliate Code</Label>
          <Input
            id="code"
            {...register("code")}
            placeholder="e.g., AFF001"
            data-testid="input-affiliate-code"
          />
          {errors.code && (
            <p className="text-sm text-destructive mt-1">{errors.code.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Affiliate name"
            data-testid="input-affiliate-name"
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="affiliate@example.com"
            data-testid="input-affiliate-email"
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="commissionRate">Commission Rate (%)</Label>
          <Input
            id="commissionRate"
            type="number"
            step="0.01"
            {...register("commissionRate")}
            placeholder="10.00"
            data-testid="input-commission-rate"
          />
          {errors.commissionRate && (
            <p className="text-sm text-destructive mt-1">{errors.commissionRate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Input
            id="paymentMethod"
            {...register("paymentMethod")}
            placeholder="Bank transfer, PayPal, etc."
            data-testid="input-payment-method"
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            {...register("status")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="select-affiliate-status"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <Button type="submit" disabled={isPending} data-testid="button-submit-affiliate">
        {isPending ? "Saving..." : "Save Affiliate"}
      </Button>
    </form>
  );
}

export default function Affiliates() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAffiliate, setEditAffiliate] = useState<Affiliate | null>(null);
  const [deleteAffiliate, setDeleteAffiliate] = useState<Affiliate | null>(null);

  const { data: affiliates = [], isLoading } = useQuery<Affiliate[]>({
    queryKey: ["/api/affiliates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: AffiliateFormData) => {
      return await apiRequest("POST", "/api/affiliates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates"] });
      setIsCreateOpen(false);
      toast({ title: "Affiliate created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: AffiliateFormData & { id: string }) => {
      return await apiRequest("PATCH", `/api/affiliates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates"] });
      setEditAffiliate(null);
      toast({ title: "Affiliate updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/affiliates/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates"] });
      setDeleteAffiliate(null);
      toast({ title: "Affiliate deleted successfully" });
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Affiliate Management</h1>
          <p className="text-muted-foreground">
            Manage affiliate partners and track referrals
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-affiliate">
          <Plus className="h-4 w-4 mr-2" />
          Add Affiliate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-affiliates">{affiliates.length}</div>
            <p className="text-xs text-muted-foreground">
              {affiliates.filter(a => a.status === 'active').length} active
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Affiliates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading affiliates...</div>
          ) : affiliates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No affiliates yet. Create your first affiliate to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Commission Rate</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((affiliate) => (
                  <TableRow key={affiliate.id} data-testid={`row-affiliate-${affiliate.id}`}>
                    <TableCell className="font-medium">{affiliate.code}</TableCell>
                    <TableCell>{affiliate.name}</TableCell>
                    <TableCell>{affiliate.email}</TableCell>
                    <TableCell className="text-right">{affiliate.commissionRate}%</TableCell>
                    <TableCell>{affiliate.paymentMethod || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          affiliate.status === 'active' ? 'default' :
                          affiliate.status === 'suspended' ? 'destructive' : 'secondary'
                        }
                      >
                        {affiliate.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditAffiliate(affiliate)}
                          data-testid={`button-edit-${affiliate.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteAffiliate(affiliate)}
                          data-testid={`button-delete-${affiliate.id}`}
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent data-testid="dialog-create-affiliate">
          <DialogHeader>
            <DialogTitle>Create Affiliate</DialogTitle>
            <DialogDescription>Add a new affiliate partner</DialogDescription>
          </DialogHeader>
          <AffiliateForm
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAffiliate} onOpenChange={(open) => !open && setEditAffiliate(null)}>
        <DialogContent data-testid="dialog-edit-affiliate">
          <DialogHeader>
            <DialogTitle>Edit Affiliate</DialogTitle>
            <DialogDescription>Update affiliate details</DialogDescription>
          </DialogHeader>
          {editAffiliate && (
            <AffiliateForm
              defaultValues={{
                code: editAffiliate.code,
                name: editAffiliate.name,
                email: editAffiliate.email,
                commissionRate: editAffiliate.commissionRate,
                paymentMethod: editAffiliate.paymentMethod,
                status: editAffiliate.status as any,
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editAffiliate.id, ...data })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAffiliate} onOpenChange={(open) => !open && setDeleteAffiliate(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Affiliate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteAffiliate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAffiliate && deleteMutation.mutate(deleteAffiliate.id)}
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
