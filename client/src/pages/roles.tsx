import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Shield, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const PERMISSION_GROUPS = {
  "Client Management": [
    { id: 'client.view', label: 'View Clients' },
    { id: 'client.view_all', label: 'View All Clients' },
    { id: 'client.create', label: 'Create Clients' },
    { id: 'client.edit', label: 'Edit Clients' },
    { id: 'client.delete', label: 'Delete Clients' },
    { id: 'client.view_pii', label: 'View PII (Unmasked)' },
  ],
  "Trading": [
    { id: 'trade.view', label: 'View Trades' },
    { id: 'trade.create', label: 'Create Trades' },
    { id: 'trade.edit', label: 'Edit Trades' },
    { id: 'trade.close', label: 'Close Trades' },
  ],
  "Balance & Transactions": [
    { id: 'balance.view', label: 'View Balance' },
    { id: 'balance.adjust', label: 'Adjust Balance' },
  ],
  "Administration": [
    { id: 'role.view', label: 'View Roles' },
    { id: 'role.create', label: 'Create Roles' },
    { id: 'role.edit', label: 'Edit Roles' },
    { id: 'role.delete', label: 'Delete Roles' },
    { id: 'team.view', label: 'View Teams' },
    { id: 'team.manage', label: 'Manage Teams' },
  ],
  "Data Operations": [
    { id: 'data.import', label: 'Import Data' },
    { id: 'data.export', label: 'Export Data' },
    { id: 'audit.view', label: 'View Audit Logs' },
  ],
  "Special Permissions": [
    { id: 'client.impersonate', label: 'Impersonate Client' },
    { id: 'client.call', label: 'Call Client' },
  ],
};

export default function Roles() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as string[] });
  const { toast } = useToast();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['/api/roles'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({ title: "Role created successfully" });
      setIsOpen(false);
      setFormData({ name: '', description: '', permissions: [] });
    },
  });

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-roles-title">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage user roles and access control
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-role" className="hover-elevate active-elevate-2">
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Compliance Officer"
                  data-testid="input-role-name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Role description..."
                  data-testid="input-role-description"
                />
              </div>
              <div>
                <Label className="text-base mb-4 block">Permissions</Label>
                <div className="space-y-6">
                  {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => (
                    <div key={group} className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">{group}</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={() => handlePermissionToggle(permission.id)}
                              data-testid={`checkbox-${permission.id}`}
                            />
                            <Label htmlFor={permission.id} className="text-sm font-normal cursor-pointer">
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending}
                  data-testid="button-save-role"
                  className="hover-elevate active-elevate-2"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Role'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles?.map((role: any) => (
            <Card key={role.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg" data-testid={`text-role-${role.id}`}>{role.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-role-${role.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-delete-role-${role.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Permissions ({role.permissions?.length || 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions?.slice(0, 3).map((permission: string) => (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {permission.split('.')[1]}
                      </Badge>
                    ))}
                    {role.permissions?.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{role.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {role.userCount || 0} users assigned
                  </p>
                </div>
              </CardContent>
            </Card>
          )) || (
            <div className="col-span-full text-center py-12">
              <p className="text-sm text-muted-foreground">No roles found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
