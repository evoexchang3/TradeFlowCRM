import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Phone, Mail, MoreVertical, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTeamId, setFilterTeamId] = useState<string>('');
  const [filterAgentId, setFilterAgentId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState<string>('');
  const [bulkAssignTeamId, setBulkAssignTeamId] = useState<string>('');
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedClientForComment, setSelectedClientForComment] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const { toast } = useToast();
  
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  
  const { data: allClients, isLoading } = useQuery({
    queryKey: ['/api/clients'],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['/api/users/agents'],
  });

  // Apply client-side filtering
  const clients = allClients?.filter((client: any) => {
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch = 
        client.firstName?.toLowerCase().includes(search) ||
        client.lastName?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.id?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Team filter
    if (filterTeamId && filterTeamId !== 'all') {
      if (filterTeamId === 'unassigned') {
        if (client.teamId) return false;
      } else {
        if (client.teamId !== filterTeamId) return false;
      }
    }

    // Agent filter
    if (filterAgentId && filterAgentId !== 'all') {
      if (filterAgentId === 'unassigned') {
        if (client.assignedAgentId) return false;
      } else {
        if (client.assignedAgentId !== filterAgentId) return false;
      }
    }

    // Status filter
    if (filterStatus && filterStatus !== 'all') {
      if (client.status !== filterStatus) return false;
    }

    return true;
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (data: { clientIds: string[]; assignedAgentId?: string | null; teamId?: string | null }) =>
      apiRequest('POST', '/api/clients/bulk-assign', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setSelectedClients(new Set());
      setBulkAssignOpen(false);
      setBulkAssignAgentId('');
      setBulkAssignTeamId('');
      toast({
        title: "Bulk assignment completed",
        description: `Successfully assigned ${selectedClients.size} client(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk assignment failed",
        description: error.message || "Failed to assign clients.",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ clientId, comment }: { clientId: string; comment: string }) =>
      apiRequest('POST', `/api/clients/${clientId}/comments`, { text: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setCommentDialogOpen(false);
      setCommentText('');
      setSelectedClientForComment(null);
      toast({
        title: "Comment added",
        description: "Your comment has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment.",
        variant: "destructive",
      });
    },
  });

  const assignAgentMutation = useMutation({
    mutationFn: ({ clientId, assignedAgentId }: { clientId: string; assignedAgentId: string | null }) =>
      apiRequest('PATCH', `/api/clients/${clientId}`, { assignedAgentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Agent assigned",
        description: "Client agent has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign agent.",
        variant: "destructive",
      });
    },
  });

  const updatePipelineStatusMutation = useMutation({
    mutationFn: ({ clientId, pipelineStatus }: { clientId: string; pipelineStatus: string | null }) =>
      apiRequest('PATCH', `/api/clients/${clientId}`, { pipelineStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Pipeline status updated",
        description: "Client pipeline status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pipeline status.",
        variant: "destructive",
      });
    },
  });

  const updateKycStatusMutation = useMutation({
    mutationFn: ({ clientId, kycStatus }: { clientId: string; kycStatus: string }) =>
      apiRequest('PATCH', `/api/clients/${clientId}/kyc`, { kycStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "KYC status updated",
        description: "Client KYC status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update KYC status.",
        variant: "destructive",
      });
    },
  });

  // Check if user can assign agents (Team Leader, CRM Manager, or Admin only)
  const canAssignAgents = () => {
    if (!currentUser || !currentUser.role) return false;
    const roleName = currentUser.role.name?.toLowerCase();
    return roleName === 'administrator' || roleName === 'crm manager' || roleName === 'team leader';
  };

  const handleToggleClient = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedClients.size === clients?.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clients?.map((c: any) => c.id) || []));
    }
  };

  const handleBulkAssign = () => {
    const data: any = { clientIds: Array.from(selectedClients) };
    if (bulkAssignAgentId) {
      data.assignedAgentId = bulkAssignAgentId === 'none' ? null : bulkAssignAgentId;
    }
    if (bulkAssignTeamId) {
      data.teamId = bulkAssignTeamId === 'none' ? null : bulkAssignTeamId;
    }
    bulkAssignMutation.mutate(data);
  };

  const getKycStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      verified: { variant: "default", label: "Verified" },
      pending: { variant: "secondary", label: "Pending" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant as any} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const getPipelineStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      new_lead: { variant: "default", label: "New Lead" },
      contact_attempted: { variant: "secondary", label: "Contact Attempted" },
      in_discussion: { variant: "secondary", label: "In Discussion" },
      kyc_pending: { variant: "secondary", label: "KYC Pending" },
      active_client: { variant: "default", label: "Active Client" },
      cold_inactive: { variant: "secondary", label: "Cold/Inactive" },
      lost: { variant: "destructive", label: "Lost" },
    };
    const config = variants[status] || { variant: "secondary", label: "Unknown" };
    return (
      <Badge variant={config.variant as any} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-clients-title">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage client accounts and information
          </p>
        </div>
        <Button asChild size="sm" data-testid="button-add-client" className="hover-elevate active-elevate-2">
          <Link href="/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-clients"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-team">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAgentId} onValueChange={setFilterAgentId}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-agent">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reassigned">Reassigned</SelectItem>
                  <SelectItem value="potential">Potential</SelectItem>
                  <SelectItem value="low_potential">Low Potential</SelectItem>
                  <SelectItem value="mid_potential">Mid Potential</SelectItem>
                  <SelectItem value="high_potential">High Potential</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="callback_requested">Callback Requested</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>

              {(filterTeamId || filterAgentId || filterStatus || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterTeamId('');
                    setFilterAgentId('');
                    setFilterStatus('');
                    setSearchQuery('');
                  }}
                  data-testid="button-clear-filters"
                  className="hover-elevate active-elevate-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {clients && allClients && clients.length !== allClients.length && (
              <p className="text-sm text-muted-foreground">
                Showing {clients.length} of {allClients.length} clients
              </p>
            )}
          </div>

          {selectedClients.size > 0 && (
            <div className="flex items-center justify-between p-3 mb-4 bg-primary/10 rounded-md border border-primary/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium" data-testid="text-selected-count">
                  {selectedClients.size} client{selectedClients.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClients(new Set())}
                  data-testid="button-clear-selection"
                  className="hover-elevate active-elevate-2"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBulkAssignOpen(true)}
                  data-testid="button-bulk-assign"
                  className="hover-elevate active-elevate-2"
                >
                  Assign Clients
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedClients.size === clients?.length && clients?.length > 0}
                      onCheckedChange={handleToggleAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Pipeline Status</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((client: any) => (
                  <TableRow key={client.id} className="hover-elevate">
                    <TableCell>
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => handleToggleClient(client.id)}
                        data-testid={`checkbox-client-${client.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm" data-testid={`text-client-name-${client.id}`}>
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {client.id?.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {client.account?.accountNumber || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={client.pipelineStatus || 'none'}
                        onValueChange={(value) => updatePipelineStatusMutation.mutate({
                          clientId: client.id,
                          pipelineStatus: value === 'none' ? null : value
                        })}
                      >
                        <SelectTrigger className="w-[150px] h-8 text-xs" data-testid={`select-pipeline-${client.id}`}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="new_lead">New Lead</SelectItem>
                          <SelectItem value="contact_attempted">Contact Attempted</SelectItem>
                          <SelectItem value="in_discussion">In Discussion</SelectItem>
                          <SelectItem value="kyc_pending">KYC Pending</SelectItem>
                          <SelectItem value="active_client">Active Client</SelectItem>
                          <SelectItem value="cold_inactive">Cold/Inactive</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={client.kycStatus}
                        onValueChange={(value) => updateKycStatusMutation.mutate({
                          clientId: client.id,
                          kycStatus: value
                        })}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs" data-testid={`select-kyc-${client.id}`}>
                          <SelectValue placeholder="Select KYC" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono font-medium text-sm" data-testid={`text-client-balance-${client.id}`}>
                          ${(client.account?.balance || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Equity: ${(client.account?.equity || 0).toLocaleString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={client.assignedAgentId || 'unassigned'}
                        onValueChange={(value) => assignAgentMutation.mutate({
                          clientId: client.id,
                          assignedAgentId: value === 'unassigned' ? null : value
                        })}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs" data-testid={`select-agent-${client.id}`}>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {agents.map((agent: any) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!client.phone}
                          asChild={!!client.phone}
                          data-testid={`button-call-${client.id}`}
                        >
                          {client.phone ? (
                            <a href={`tel:${client.phone}`}>
                              <Phone className="h-3 w-3" />
                            </a>
                          ) : (
                            <Phone className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          data-testid={`button-email-${client.id}`}
                        >
                          <a href={`mailto:${client.email}`}>
                            <Mail className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedClientForComment(client);
                            setCommentDialogOpen(true);
                          }}
                          data-testid={`button-comment-${client.id}`}
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${client.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}/edit`}>Edit Client</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Call Client</DropdownMenuItem>
                          <DropdownMenuItem>Login as Client</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <p className="text-sm text-muted-foreground">No clients found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent data-testid="dialog-bulk-assign">
          <DialogHeader>
            <DialogTitle>Bulk Assign Clients</DialogTitle>
            <DialogDescription>
              Assign {selectedClients.size} selected client{selectedClients.size > 1 ? 's' : ''} to an agent or team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Agent</label>
              <Select
                value={bulkAssignAgentId}
                onValueChange={setBulkAssignAgentId}
              >
                <SelectTrigger data-testid="select-bulk-agent">
                  <SelectValue placeholder="Select agent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Team</label>
              <Select
                value={bulkAssignTeamId}
                onValueChange={setBulkAssignTeamId}
              >
                <SelectTrigger data-testid="select-bulk-team">
                  <SelectValue placeholder="Select team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkAssignOpen(false)}
              data-testid="button-cancel-bulk-assign"
              className="hover-elevate active-elevate-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssignMutation.isPending || (!bulkAssignAgentId && !bulkAssignTeamId)}
              data-testid="button-confirm-bulk-assign"
              className="hover-elevate active-elevate-2"
            >
              {bulkAssignMutation.isPending ? "Assigning..." : "Assign Clients"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent data-testid="dialog-add-comment">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              Add a note or comment for {selectedClientForComment?.firstName} {selectedClientForComment?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              data-testid="textarea-comment"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCommentDialogOpen(false);
                setCommentText('');
                setSelectedClientForComment(null);
              }}
              data-testid="button-cancel-comment"
              className="hover-elevate active-elevate-2"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedClientForComment && commentText.trim()) {
                  commentMutation.mutate({
                    clientId: selectedClientForComment.id,
                    comment: commentText.trim()
                  });
                }
              }}
              disabled={commentMutation.isPending || !commentText.trim()}
              data-testid="button-save-comment"
              className="hover-elevate active-elevate-2"
            >
              {commentMutation.isPending ? "Saving..." : "Save Comment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
