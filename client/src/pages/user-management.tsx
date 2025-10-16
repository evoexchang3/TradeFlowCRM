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

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string().min(1, "Role is required"),
  teamId: z.string().optional(),
});

const editUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  roleId: z.string().min(1, "Role is required"),
  teamId: z.string().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const adjustWorkloadSchema = z.object({
  currentWorkload: z.coerce.number().min(0, "Current workload cannot be negative"),
  maxWorkload: z.coerce.number().min(1, "Max workload must be at least 1").max(200, "Max workload cannot exceed 200"),
}).refine((data) => data.currentWorkload <= data.maxWorkload, {
  message: "Current workload cannot exceed max workload",
  path: ["currentWorkload"],
});

type CreateUserData = z.infer<typeof createUserSchema>;
type EditUserData = z.infer<typeof editUserSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
type AdjustWorkloadData = z.infer<typeof adjustWorkloadSchema>;

export default function UserManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [adjustWorkloadDialogOpen, setAdjustWorkloadDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { toast } = useToast();

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
    resolver: zodResolver(createUserSchema),
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
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      roleId: "",
      teamId: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const adjustWorkloadForm = useForm<AdjustWorkloadData>({
    resolver: zodResolver(adjustWorkloadSchema),
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
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
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
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
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
        title: "Success",
        description: "Password reset successfully",
      });
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      resetPasswordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
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
        title: "Success",
        description: "User status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
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
        title: "Success",
        description: "Workload adjusted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setAdjustWorkloadDialogOpen(false);
      setSelectedUser(null);
      adjustWorkloadForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust workload",
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
    return roles.find(r => r.id === roleId)?.name || 'N/A';
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'N/A';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage CRM staff users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-user">
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Workload</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
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
                        <Badge variant="default" data-testid={`badge-user-active-${user.id}`}>Active</Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-user-inactive-${user.id}`}>Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm" data-testid={`text-user-lastlogin-${user.id}`}>
                      {user.lastLogin
                        ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                        : 'Never'}
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
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new CRM staff member with assigned role and team
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
                      <FormLabel>First Name</FormLabel>
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
                      <FormLabel>Last Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
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
                    <FormLabel>Password</FormLabel>
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
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select a role" />
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
                    <FormLabel>Team (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-team">
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Team</SelectItem>
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information, role, and team assignment
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
                      <FormLabel>First Name</FormLabel>
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
                      <FormLabel>Last Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
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
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue placeholder="Select a role" />
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
                    <FormLabel>Team (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-team">
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Team</SelectItem>
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent data-testid="dialog-reset-password">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit((data) => resetPasswordMutation.mutate({ id: selectedUser?.id, newPassword: data.newPassword }))} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
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
                    <FormLabel>Confirm Password</FormLabel>
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-submit-reset"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Adjust Workload Dialog */}
      <Dialog open={adjustWorkloadDialogOpen} onOpenChange={setAdjustWorkloadDialogOpen}>
        <DialogContent data-testid="dialog-adjust-workload">
          <DialogHeader>
            <DialogTitle>Adjust Workload</DialogTitle>
            <DialogDescription>
              Update workload settings for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <Form {...adjustWorkloadForm}>
            <form onSubmit={adjustWorkloadForm.handleSubmit((data) => adjustWorkloadMutation.mutate({ id: selectedUser?.id, data }))} className="space-y-4">
              <FormField
                control={adjustWorkloadForm.control}
                name="currentWorkload"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Workload</FormLabel>
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
                    <FormLabel>Max Workload</FormLabel>
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={adjustWorkloadMutation.isPending}
                  data-testid="button-submit-workload"
                >
                  {adjustWorkloadMutation.isPending ? 'Adjusting...' : 'Adjust Workload'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
