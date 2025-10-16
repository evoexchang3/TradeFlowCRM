import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, DollarSign, TrendingUp, Phone, Mail, MessageSquare, MoreVertical, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

type CustomStatus = {
  id: string;
  name: string;
  color: string;
  icon: string;
  category: string;
};

export default function RetentionClients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [filterAgentId, setFilterAgentId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFundType, setFilterFundType] = useState<string>('all');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState('');
  const [bulkAssignTeamId, setBulkAssignTeamId] = useState('');
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedClientForComment, setSelectedClientForComment] = useState<any>(null);
  const { toast } = useToast();
  
  const { data: retentionClients, isLoading } = useQuery({
    queryKey: ['/api/clients/retention'],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['/api/users/agents'],
  });

  const { data: customStatuses = [] } = useQuery<CustomStatus[]>({
    queryKey: ['/api/custom-statuses'],
  });

  // Client-side filtering
  const clients = retentionClients?.filter((client: any) => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch = 
        client.name?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    if (filterTeamId && filterTeamId !== 'all') {
      if (client.teamId !== filterTeamId) return false;
    }

    if (filterAgentId && filterAgentId !== 'all') {
      if (filterAgentId === 'unassigned') {
        if (client.assignedAgentId) return false;
      } else {
        if (client.assignedAgentId !== filterAgentId) return false;
      }
    }

    if (filterStatus && filterStatus !== 'all') {
      if (client.statusId !== filterStatus) return false;
    }

    if (filterFundType && filterFundType !== 'all') {
      if (client.ftdFundType !== filterFundType) return false;
    }

    return true;
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (data: { clientIds: string[]; assignedAgentId?: string | null; teamId?: string | null }) =>
      apiRequest('POST', '/api/clients/bulk-assign', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/retention'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/clients/retention'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/clients/retention'] });
      toast({
        title: "Agent assigned",
        description: "Client has been assigned successfully.",
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

  const updateCustomStatusMutation = useMutation({
    mutationFn: ({ clientId, statusId }: { clientId: string; statusId: string | null }) =>
      apiRequest('PATCH', `/api/clients/${clientId}`, { statusId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/retention'] });
      toast({
        title: "Status updated",
        description: "Client status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  const updateKycStatusMutation = useMutation({
    mutationFn: ({ clientId, kycStatus }: { clientId: string; kycStatus: string }) =>
      apiRequest('PATCH', `/api/clients/${clientId}/kyc`, { kycStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/retention'] });
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

  const getFundTypeBadge = (fundType: string) => {
    const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      real: { label: 'Real', variant: 'default' },
      demo: { label: 'Demo', variant: 'secondary' },
      bonus: { label: 'Bonus', variant: 'outline' },
    };
    const config = typeMap[fundType] || { label: fundType, variant: 'outline' };
    return <Badge variant={config.variant} data-testid={`badge-fund-type-${fundType}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading retention clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Retention Clients</h1>
          <p className="text-muted-foreground">
            Clients with First Time Deposit (FTD)
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-stats-title">Retention Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold" data-testid="text-total-clients">{clients?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Real Fund FTDs</p>
              <p className="text-2xl font-bold" data-testid="text-real-ftds">
                {clients?.filter((c: any) => c.ftdFundType === 'real').length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Demo Fund FTDs</p>
              <p className="text-2xl font-bold" data-testid="text-demo-ftds">
                {clients?.filter((c: any) => c.ftdFundType === 'demo').length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total FTD Value</p>
              <p className="text-2xl font-bold" data-testid="text-total-ftd-value">
                ${clients?.reduce((sum: number, c: any) => sum + (parseFloat(c.ftdAmount || '0')), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterTeamId} onValueChange={setFilterTeamId}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-team-filter">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAgentId} onValueChange={setFilterAgentId}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-agent-filter">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agents.map((agent: any) => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {customStatuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFundType} onValueChange={setFilterFundType}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-fundtype-filter">
                <SelectValue placeholder="All Fund Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fund Types</SelectItem>
                <SelectItem value="real">Real</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
              </SelectContent>
            </Select>
            {(filterTeamId !== 'all' || filterAgentId !== 'all' || filterStatus !== 'all' || filterFundType !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterTeamId('all');
                  setFilterAgentId('all');
                  setFilterStatus('all');
                  setFilterFundType('all');
                  setSearchQuery('');
                }}
                data-testid="button-clear-filters"
                className="hover-elevate active-elevate-2"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent className="pt-6">
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
                <TableHead>Status</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>FTD Amount</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients && clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-clients">No retention clients found</p>
                  </TableCell>
                </TableRow>
              ) : (
                clients?.map((client: any) => {
                  const team = teams.find((t: any) => t.id === client.teamId);
                  return (
                    <TableRow key={client.id} className="hover-elevate" data-testid={`row-client-${client.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedClients.has(client.id)}
                          onCheckedChange={() => handleToggleClient(client.id)}
                          data-testid={`checkbox-client-${client.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/clients/${client.id}`}>
                          <a className="font-medium hover:underline text-sm" data-testid={`link-client-${client.id}`}>
                            {client.name}
                          </a>
                        </Link>
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
                        <Select
                          value={client.statusId || 'none'}
                          onValueChange={(value) => updateCustomStatusMutation.mutate({
                            clientId: client.id,
                            statusId: value === 'none' ? null : value
                          })}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs" data-testid={`select-status-${client.id}`}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {customStatuses.map((status: CustomStatus) => (
                              <SelectItem key={status.id} value={status.id}>
                                {status.name}
                              </SelectItem>
                            ))}
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
                          <SelectTrigger className="w-[110px] h-8 text-xs" data-testid={`select-kyc-${client.id}`}>
                            <SelectValue placeholder="KYC" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={client.assignedAgentId || 'unassigned'}
                          onValueChange={(value) => assignAgentMutation.mutate({
                            clientId: client.id,
                            assignedAgentId: value === 'unassigned' ? null : value
                          })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs" data-testid={`select-agent-${client.id}`}>
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
                      <TableCell className="font-medium text-sm" data-testid={`text-ftd-amount-${client.id}`}>
                        ${parseFloat(client.ftdAmount || '0').toFixed(2)}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {getFundTypeBadge(client.ftdFundType)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-team-${client.id}`}>
                        <span className="text-sm">{team?.name || 'Unassigned'}</span>
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
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1">
                          <Link href={`/clients/${client.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-view-client-${client.id}`}
                              className="h-8"
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Activity
                            </Button>
                          </Link>
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
                              <DropdownMenuItem asChild>
                                <Link href={`/chat?clientId=${client.id}`}>Start Chat</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent data-testid="dialog-bulk-assign">
          <DialogHeader>
            <DialogTitle>Bulk Assign Clients</DialogTitle>
            <DialogDescription>
              Assign {selectedClients.size} selected client{selectedClients.size > 1 ? 's' : ''} to an agent or team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to Agent</label>
              <Select value={bulkAssignAgentId} onValueChange={setBulkAssignAgentId}>
                <SelectTrigger data-testid="select-bulk-agent">
                  <SelectValue placeholder="Select agent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Remove Agent</SelectItem>
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to Team</label>
              <Select value={bulkAssignTeamId} onValueChange={setBulkAssignTeamId}>
                <SelectTrigger data-testid="select-bulk-team">
                  <SelectValue placeholder="Select team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Remove Team</SelectItem>
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
              onClick={() => {
                setBulkAssignOpen(false);
                setBulkAssignAgentId('');
                setBulkAssignTeamId('');
              }}
              data-testid="button-cancel-bulk-assign"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssignMutation.isPending || (!bulkAssignAgentId && !bulkAssignTeamId)}
              data-testid="button-confirm-bulk-assign"
            >
              {bulkAssignMutation.isPending ? "Assigning..." : "Assign Clients"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent data-testid="dialog-add-comment">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              Add a note or comment for {selectedClientForComment?.name}
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
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (commentText.trim() && selectedClientForComment) {
                  commentMutation.mutate({
                    clientId: selectedClientForComment.id,
                    comment: commentText
                  });
                }
              }}
              disabled={commentMutation.isPending || !commentText.trim()}
              data-testid="button-save-comment"
            >
              {commentMutation.isPending ? "Saving..." : "Save Comment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
