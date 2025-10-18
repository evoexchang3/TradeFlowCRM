import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, KeyRound, UserCheck, UserX, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

const createUserSchema = (t: (key: string) => string) => z.object({
  firstName: z.string().min(1, t("users.validation.first.name.required")),
  lastName: z.string().min(1, t("users.validation.last.name.required")),
  email: z.string().email(t("users.validation.email.invalid")),
  password: z.string().min(6, t("users.validation.password.min")),
  roleId: z.string().min(1, t("users.validation.role.required")),
  teamId: z.string().optional(),
});

const editUserSchema = (t: (key: string) => string) => z.object({
  firstName: z.string().min(1, t("users.validation.first.name.required")),
  lastName: z.string().min(1, t("users.validation.last.name.required")),
  email: z.string().email(t("users.validation.email.invalid")),
  roleId: z.string().min(1, t("users.validation.role.required")),
  teamId: z.string().optional(),
});

const resetPasswordSchema = (t: (key: string) => string) => z.object({
  newPassword: z.string().min(6, t("users.validation.password.min")),
  confirmPassword: z.string().min(6, t("users.validation.password.min")),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: t("users.validation.passwords.no.match"),
  path: ["confirmPassword"],
});

const adjustWorkloadSchema = (t: (key: string) => string) => z.object({
  currentWorkload: z.coerce.number().min(0, t("users.validation.workload.negative")),
  maxWorkload: z.coerce.number().min(1, t("users.validation.max.workload.min")).max(200, t("users.validation.max.workload.max")),
}).refine((data) => data.currentWorkload <= data.maxWorkload, {
  message: t("users.validation.workload.exceeds"),
  path: ["currentWorkload"],
});

export default function UserManagement() {
  const { t } = useLanguage();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [adjustWorkloadDialogOpen, setAdjustWorkloadDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { toast } = useToast();

  type CreateUserData = z.infer<ReturnType<typeof createUserSchema>>;
  type EditUserData = z.infer<ReturnType<typeof editUserSchema>>;
  type ResetPasswordData = z.infer<ReturnType<typeof resetPasswordSchema>>;
  type AdjustWorkloadData = z.infer<ReturnType<typeof adjustWorkloadSchema>>;

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ['/api/roles'],
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const createForm = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema(t)),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      roleId: "",
      teamId: "",
    },
  });

  const editForm = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema(t)),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      roleId: "",
      teamId: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema(t)),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const adjustWorkloadForm = useForm<AdjustWorkloadData>({
    resolver: zodResolver(adjustWorkloadSchema(t)),
    defaultValues: {
      currentWorkload: 0,
      maxWorkload: 50,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const payload = {
        ...data,
        teamId: data.teamId === "none" || !data.teamId ? undefined : data.teamId
      };
      const res = await apiRequest('POST', '/api/users', payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("users.created.success"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("users.created.error"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditUserData }) => {
      const payload = {
        ...data,
        teamId: data.teamId === "none" || !data.teamId ? undefined : data.teamId
      };
      const res = await apiRequest('PATCH', `/api/users/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("users.updated.success"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("users.updated.error"),
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const res = await apiRequest('POST', `/api/users/${id}/reset-password`, { newPassword });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("users.password.reset.success"),
      });
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      resetPasswordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("users.password.reset.error"),
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest('PATCH', `/api/users/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("users.status.updated.success"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("users.status.updated.error"),
        variant: "destructive",
      });
    },
  });

  const adjustWorkloadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdjustWorkloadData }) => {
      const res = await apiRequest('PATCH', `/api/agents/${id}/workload`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("users.workload.adjusted.success"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setAdjustWorkloadDialogOpen(false);
      setSelectedUser(null);
      adjustWorkloadForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("users.workload.adjusted.error"),
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleId: user.roleId,
      teamId: user.teamId || "none",
    });
    setEditDialogOpen(true);
  };

  const handleResetPassword = (user: any) => {
    setSelectedUser(user);
    resetPasswordForm.reset();
    setResetPasswordDialogOpen(true);
  };

  const handleAdjustWorkload = (user: any) => {
    setSelectedUser(user);
    adjustWorkloadForm.reset({
      currentWorkload: user.currentWorkload || 0,
      maxWorkload: user.maxWorkload || 50,
    });
    setAdjustWorkloadDialogOpen(true);
  };

  const handleToggleActive = (user: any) => {
    toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive });
  };

  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId)?.name || t("common.na");
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || t("common.na");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">{t("users.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("users.subtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-user">
          <Plus className="h-4 w-4 mr-2" />
          {t("users.create.user")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("users.all.users")}</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("users.no.users.found")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.name")}</TableHead>
                  <TableHead>{t("users.email")}</TableHead>
                  <TableHead>{t("users.role")}</TableHead>
                  <TableHead>{t("users.team")}</TableHead>
                  <TableHead>{t("users.workload")}</TableHead>
                  <TableHead>{t("users.status")}</TableHead>
                  <TableHead>{t("users.last.login")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell data-testid={`text-user-email-${user.id}`}>{user.email}</TableCell>
                    <TableCell data-testid={`text-user-role-${user.id}`}>
                      {getRoleName(user.roleId)}
                    </TableCell>
                    <TableCell data-testid={`text-user-team-${user.id}`}>
                      {user.teamId ? getTeamName(user.teamId) : '-'}
                    </TableCell>
                    <TableCell data-testid={`text-user-workload-${user.id}`}>
                      <span className="text-sm">
                        {user.currentWorkload || 0} / {user.maxWorkload || 50}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="default" data-testid={`badge-user-active-${user.id}`}>{t("users.active")}</Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-user-inactive-${user.id}`}>{t("users.inactive")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm" data-testid={`text-user-lastlogin-${user.id}`}>
                      {user.lastLogin
                        ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                        : t("users.never")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetPassword(user)}
                          data-testid={`button-reset-password-${user.id}`}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAdjustWorkload(user)}
                          data-testid={`button-adjust-workload-${user.id}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(user)}
                          disabled={toggleActiveMutation.isPending}
                          data-testid={`button-toggle-active-${user.id}`}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
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

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-user">
          <DialogHeader>
            <DialogTitle>{t("users.create.new.user")}</DialogTitle>
            <DialogDescription>
              {t("users.create.description")}
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("users.first.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("users.last.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.password")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.role")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder={t("users.select.role")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.team.optional")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-team">
                          <SelectValue placeholder={t("users.select.team")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("users.no.team")}</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? t("users.creating") : t("users.create.user")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>{t("users.edit.user")}</DialogTitle>
            <DialogDescription>
              {t("users.edit.description")}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: selectedUser?.id, data }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("users.first.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("users.last.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.role")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue placeholder={t("users.select.role")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.team.optional")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-team">
                          <SelectValue placeholder={t("users.select.team")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("users.no.team")}</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? t("users.updating") : t("common.update")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent data-testid="dialog-reset-password">
          <DialogHeader>
            <DialogTitle>{t("users.reset.password.title")}</DialogTitle>
            <DialogDescription>
              {t("users.reset.password.description")}
            </DialogDescription>
          </DialogHeader>
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit((data) => resetPasswordMutation.mutate({ id: selectedUser?.id, newPassword: data.newPassword }))} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.new.password")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resetPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.confirm.password")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-confirm-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPasswordDialogOpen(false)}
                  data-testid="button-cancel-reset"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-submit-reset"
                >
                  {resetPasswordMutation.isPending ? t("users.resetting") : t("users.reset.password")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustWorkloadDialogOpen} onOpenChange={setAdjustWorkloadDialogOpen}>
        <DialogContent data-testid="dialog-adjust-workload">
          <DialogHeader>
            <DialogTitle>{t("users.adjust.workload.title")}</DialogTitle>
            <DialogDescription>
              {t("users.adjust.workload.description")}
            </DialogDescription>
          </DialogHeader>
          <Form {...adjustWorkloadForm}>
            <form onSubmit={adjustWorkloadForm.handleSubmit((data) => adjustWorkloadMutation.mutate({ id: selectedUser?.id, data }))} className="space-y-4">
              <FormField
                control={adjustWorkloadForm.control}
                name="currentWorkload"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.current.workload")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-current-workload" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={adjustWorkloadForm.control}
                name="maxWorkload"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.maximum.workload")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-max-workload" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustWorkloadDialogOpen(false)}
                  data-testid="button-cancel-workload"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={adjustWorkloadMutation.isPending}
                  data-testid="button-submit-workload"
                >
                  {adjustWorkloadMutation.isPending ? t("users.adjusting") : t("users.adjust.workload")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
