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
import { useLanguage } from "@/contexts/LanguageContext";

const PERMISSION_GROUPS = {
  "Client Management": [
    { id: 'client.view', label: 'roles.perm.client.view' },
    { id: 'client.view_all', label: 'roles.perm.client.view_all' },
    { id: 'client.create', label: 'roles.perm.client.create' },
    { id: 'client.edit', label: 'roles.perm.client.edit' },
    { id: 'client.delete', label: 'roles.perm.client.delete' },
    { id: 'client.view_pii', label: 'roles.perm.client.view_pii' },
  ],
  "Trading": [
    { id: 'trade.view', label: 'roles.perm.trade.view' },
    { id: 'trade.create', label: 'roles.perm.trade.create' },
    { id: 'trade.edit', label: 'roles.perm.trade.edit' },
    { id: 'trade.close', label: 'roles.perm.trade.close' },
  ],
  "Balance & Transactions": [
    { id: 'balance.view', label: 'roles.perm.balance.view' },
    { id: 'balance.adjust', label: 'roles.perm.balance.adjust' },
  ],
  "Administration": [
    { id: 'role.view', label: 'roles.perm.role.view' },
    { id: 'role.create', label: 'roles.perm.role.create' },
    { id: 'role.edit', label: 'roles.perm.role.edit' },
    { id: 'role.delete', label: 'roles.perm.role.delete' },
    { id: 'team.view', label: 'roles.perm.team.view' },
    { id: 'team.manage', label: 'roles.perm.team.manage' },
  ],
  "Data Operations": [
    { id: 'data.import', label: 'roles.perm.data.import' },
    { id: 'data.export', label: 'roles.perm.data.export' },
    { id: 'audit.view', label: 'roles.perm.audit.view' },
  ],
  "Special Permissions": [
    { id: 'client.impersonate', label: 'roles.perm.client.impersonate' },
    { id: 'client.call', label: 'roles.perm.client.call' },
  ],
};

export default function Roles() {
  const { t } = useLanguage();
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
      toast({ title: t('roles.created.success') });
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
          <h1 className="text-2xl font-semibold" data-testid="text-roles-title">{t('roles.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('roles.subtitle')}
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-role" className="hover-elevate active-elevate-2">
              <Plus className="h-4 w-4 mr-2" />
              {t('roles.create.role')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? t('roles.edit.role') : t('roles.create.new.role')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('roles.role.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('roles.role.name.placeholder')}
                  data-testid="input-role-name"
                />
              </div>
              <div>
                <Label>{t('roles.description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('roles.description.placeholder')}
                  data-testid="input-role-description"
                />
              </div>
              <div>
                <Label className="text-base mb-4 block">{t('roles.permissions')}</Label>
                <div className="space-y-6">
                  {Object.entries(PERMISSION_GROUPS).map(([groupKey, permissions]) => (
                    <div key={groupKey} className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {groupKey === 'Client Management' && t('roles.client.management')}
                        {groupKey === 'Trading' && t('roles.trading')}
                        {groupKey === 'Balance & Transactions' && t('roles.balance.transactions')}
                        {groupKey === 'Administration' && t('roles.administration')}
                        {groupKey === 'Data Operations' && t('roles.data.operations')}
                        {groupKey === 'Special Permissions' && t('roles.special.permissions')}
                      </h4>
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
                              {t(permission.label)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>{t('common.cancel')}</Button>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending}
                  data-testid="button-save-role"
                  className="hover-elevate active-elevate-2"
                >
                  {createMutation.isPending ? t('roles.saving') : t('roles.save.role')}
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
                  <p className="text-xs text-muted-foreground font-medium">{t('roles.permissions')} ({role.permissions?.length || 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions?.slice(0, 3).map((permission: string) => (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {permission.split('.')[1]}
                      </Badge>
                    ))}
                    {role.permissions?.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{role.permissions.length - 3} {t('roles.more')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {role.userCount || 0} {t('roles.users.assigned')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )) || (
            <div className="col-span-full text-center py-12">
              <p className="text-sm text-muted-foreground">{t('roles.no.roles.found')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
