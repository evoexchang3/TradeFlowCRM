import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, TrendingUp, DollarSign, Send, Pencil, Trash2, Plus, Check, ArrowRightLeft, Edit, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CLIENT_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'reassigned', label: 'Reassigned' },
  { value: 'potential', label: 'Potential' },
  { value: 'low_potential', label: 'Low Potential' },
  { value: 'mid_potential', label: 'Mid Potential' },
  { value: 'high_potential', label: 'High Potential' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const PIPELINE_STATUSES = [
  { value: 'new_lead', label: 'New Lead', variant: 'secondary' as const },
  { value: 'contact_attempted', label: 'Contact Attempted', variant: 'default' as const },
  { value: 'in_discussion', label: 'In Discussion', variant: 'default' as const },
  { value: 'kyc_pending', label: 'KYC Pending', variant: 'default' as const },
  { value: 'active_client', label: 'Active Client', variant: 'default' as const },
  { value: 'cold_inactive', label: 'Cold/Inactive', variant: 'secondary' as const },
  { value: 'lost', label: 'Lost', variant: 'destructive' as const },
];

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const clientId = params?.id;
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [createSubaccountOpen, setCreateSubaccountOpen] = useState(false);
  const [newSubaccountName, setNewSubaccountName] = useState('');
  const [newSubaccountCurrency, setNewSubaccountCurrency] = useState('USD');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferFromSubaccountId, setTransferFromSubaccountId] = useState('');
  const [transferToSubaccountId, setTransferToSubaccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [filterSubaccount, setFilterSubaccount] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [clientTransferDialogOpen, setClientTransferDialogOpen] = useState(false);
  const [transferNewAgentId, setTransferNewAgentId] = useState<string>('');
  const [transferNewTeamId, setTransferNewTeamId] = useState<string>('');
  const [clientTransferReason, setClientTransferReason] = useState('');
  const [quickCommentDialogOpen, setQuickCommentDialogOpen] = useState(false);
  const [quickComment, setQuickComment] = useState('');
  const [adjustBalanceDialogOpen, setAdjustBalanceDialogOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustFundType, setAdjustFundType] = useState<'real' | 'demo' | 'bonus'>('real');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [modifyPositionDialogOpen, setModifyPositionDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [modifyOpenPrice, setModifyOpenPrice] = useState('');
  const [modifyQuantity, setModifyQuantity] = useState('');
  const [modifySide, setModifySide] = useState<'buy' | 'sell'>('buy');
  const [modifyPnl, setModifyPnl] = useState('');
  const [modifyOpenedAt, setModifyOpenedAt] = useState('');
  const { toast } = useToast();

  const { data: client, isLoading } = useQuery({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['/api/clients', clientId, 'comments'],
    enabled: !!clientId,
  });

  const { data: subaccounts = [] } = useQuery({
    queryKey: ['/api/subaccounts', client?.account?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/subaccounts?accountId=${client?.account?.id}`);
      return await res.json();
    },
    enabled: !!client?.account?.id,
  });

  const { data: internalTransfers = [] } = useQuery({
    queryKey: ['/api/internal-transfers', client?.account?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/internal-transfers?accountId=${client?.account?.id}`);
      return await res.json();
    },
    enabled: !!client?.account?.id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['/api/users/agents'],
  });

  // Filter transfers based on subaccount and date range
  const filteredTransfers = internalTransfers.filter((transfer: any) => {
    // Subaccount filter
    if (filterSubaccount !== 'all') {
      if (transfer.fromSubaccountId !== filterSubaccount && transfer.toSubaccountId !== filterSubaccount) {
        return false;
      }
    }

    // Date range filter
    const transferDate = new Date(transfer.createdAt);
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      if (transferDate < fromDate) return false;
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (transferDate > toDate) return false;
    }

    return true;
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => 
      apiRequest('PATCH', `/api/clients/${clientId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: "Status updated",
        description: "Client status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update client status.",
        variant: "destructive",
      });
    },
  });

  const updatePipelineStatusMutation = useMutation({
    mutationFn: (pipelineStatus: string) => 
      apiRequest('PATCH', `/api/clients/${clientId}`, { pipelineStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: "Pipeline status updated",
        description: "Client pipeline status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pipeline status.",
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment: string) => 
      apiRequest('POST', `/api/clients/${clientId}/comments`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'comments'] });
      setNewComment('');
      setQuickCommentDialogOpen(false);
      setQuickComment('');
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => 
      apiRequest('PATCH', `/api/comments/${id}`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'comments'] });
      setEditingCommentId(null);
      setEditingCommentText('');
      toast({
        title: "Comment updated",
        description: "Comment has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update comment.",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/comments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'comments'] });
      toast({
        title: "Comment deleted",
        description: "Comment has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive",
      });
    },
  });

  const createSubaccountMutation = useMutation({
    mutationFn: (data: { accountId: string; name: string; currency: string }) =>
      apiRequest('POST', '/api/subaccounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subaccounts', client?.account?.id] });
      setCreateSubaccountOpen(false);
      setNewSubaccountName('');
      setNewSubaccountCurrency('USD');
      toast({
        title: "Subaccount created",
        description: "New subaccount has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create subaccount.",
        variant: "destructive",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (data: { fromSubaccountId: string; toSubaccountId: string; amount: string; notes?: string }) =>
      apiRequest('POST', '/api/subaccounts/transfer', data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/subaccounts', client?.account?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/internal-transfers', client?.account?.id] });
      setTransferDialogOpen(false);
      setTransferFromSubaccountId('');
      setTransferToSubaccountId('');
      setTransferAmount('');
      setTransferNotes('');
      
      if (result.status === 'rejected') {
        toast({
          title: "Transfer rejected",
          description: "Insufficient balance in source subaccount.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Transfer completed",
          description: `Successfully transferred $${result.amount} between subaccounts.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to process transfer.",
        variant: "destructive",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: { assignedAgentId?: string | null; teamId?: string | null }) =>
      apiRequest('PATCH', `/api/clients/${clientId}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: "Assignment updated",
        description: "Client assignment has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment failed",
        description: error.message || "Failed to update assignment.",
        variant: "destructive",
      });
    },
  });

  const clientTransferMutation = useMutation({
    mutationFn: (data: { newAgentId?: string; newTeamId?: string; transferReason: string }) =>
      apiRequest('POST', `/api/clients/${clientId}/transfer`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'comments'] });
      setClientTransferDialogOpen(false);
      setTransferNewAgentId('');
      setTransferNewTeamId('');
      setClientTransferReason('');
      toast({
        title: "Client transferred",
        description: "Client has been successfully transferred and status changed to Reassigned.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer client.",
        variant: "destructive",
      });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/clients/${clientId}/impersonate`),
    onSuccess: (data: any) => {
      // Open SSO URL in new tab
      window.open(data.ssoUrl, '_blank');
      toast({
        title: "SSO token generated",
        description: "Opening Trading Platform in new tab. Token expires in 15 minutes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Impersonation failed",
        description: error.message || "Failed to generate SSO token.",
        variant: "destructive",
      });
    },
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: (data: { amount: string; fundType: 'real' | 'demo' | 'bonus'; notes?: string }) =>
      apiRequest('POST', `/api/accounts/${client?.account?.id}/adjust-balance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      setAdjustBalanceDialogOpen(false);
      setAdjustAmount('');
      setAdjustFundType('real');
      setAdjustNotes('');
      toast({
        title: "Balance adjusted",
        description: "Account balance has been successfully adjusted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Balance adjustment failed",
        description: error.message || "Failed to adjust balance.",
        variant: "destructive",
      });
    },
  });

  const modifyPositionMutation = useMutation({
    mutationFn: (data: { openPrice?: string; quantity?: string; side?: 'buy' | 'sell'; unrealizedPnl?: string; openedAt?: string }) =>
      apiRequest('PATCH', `/api/positions/${selectedPosition?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      setModifyPositionDialogOpen(false);
      setSelectedPosition(null);
      toast({
        title: "Position modified",
        description: "Position has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Position modification failed",
        description: error.message || "Failed to modify position.",
        variant: "destructive",
      });
    },
  });

  const closePositionMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: string }) =>
      apiRequest('POST', `/api/positions/${id}/close`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: "Position closed",
        description: "Position has been successfully closed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to close position",
        description: error.message || "Failed to close position.",
        variant: "destructive",
      });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: "Position deleted",
        description: "Position has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete position",
        description: error.message || "Failed to delete position.",
        variant: "destructive",
      });
    },
  });

  const updateLeverageMutation = useMutation({
    mutationFn: (leverage: number) =>
      apiRequest('PATCH', `/api/accounts/${client?.account?.id}/leverage`, { leverage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: "Leverage updated",
        description: "Account leverage has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Leverage update failed",
        description: error.message || "Failed to update leverage.",
        variant: "destructive",
      });
    },
  });

  const handleClientTransfer = () => {
    if (!clientTransferReason.trim()) {
      toast({
        title: "Transfer reason required",
        description: "Please provide a reason for the transfer.",
        variant: "destructive",
      });
      return;
    }

    if (!transferNewAgentId && !transferNewTeamId) {
      toast({
        title: "Assignment required",
        description: "Please select at least a new agent or team.",
        variant: "destructive",
      });
      return;
    }

    const data: any = { transferReason: clientTransferReason };
    if (transferNewAgentId) data.newAgentId = transferNewAgentId;
    if (transferNewTeamId) data.newTeamId = transferNewTeamId;

    clientTransferMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Client not found</p>
        <Button asChild variant="outline">
          <Link href="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'converted':
        return 'default';
      case 'high_potential':
        return 'default';
      case 'mid_potential':
        return 'secondary';
      case 'low_potential':
        return 'secondary';
      case 'lost':
      case 'not_interested':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back" className="hover-elevate">
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold" data-testid="text-client-name">
                {client.firstName} {client.lastName}
              </h1>
              <Badge 
                variant={PIPELINE_STATUSES.find(s => s.value === client.pipelineStatus)?.variant || 'secondary'}
                data-testid="badge-pipeline-status"
              >
                {PIPELINE_STATUSES.find(s => s.value === client.pipelineStatus)?.label || 'New Lead'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{client.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = `tel:${client.phone}`}
            disabled={!client.phone}
            data-testid="button-call-client" 
            className="hover-elevate active-elevate-2"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = `mailto:${client.email}`}
            data-testid="button-email-client" 
            className="hover-elevate active-elevate-2"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setQuickCommentDialogOpen(true)}
            data-testid="button-add-comment" 
            className="hover-elevate active-elevate-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => impersonateMutation.mutate()}
            disabled={impersonateMutation.isPending}
            data-testid="button-impersonate" 
            className="hover-elevate active-elevate-2"
          >
            {impersonateMutation.isPending ? "Generating..." : "Login as Client"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setClientTransferDialogOpen(true)}
            data-testid="button-transfer-client" 
            className="hover-elevate active-elevate-2"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer Client
          </Button>
          <Button size="sm" asChild data-testid="button-edit-client" className="hover-elevate active-elevate-2">
            <Link href={`/clients/${client.id}/edit`}>Edit Client</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-client-email">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-client-phone">{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p>{client.address}</p>
                  {client.city && <p>{client.city}, {client.country}</p>}
                </div>
              </div>
            )}
            {client.dateOfBirth && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(client.dateOfBirth).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pipeline Status</span>
              <Select
                value={client.pipelineStatus || 'new_lead'}
                onValueChange={(value) => updatePipelineStatusMutation.mutate(value)}
                disabled={updatePipelineStatusMutation.isPending}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-pipeline-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Client Status</span>
              <Select
                value={client.status || 'new'}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-client-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">KYC Status</span>
              <Badge variant={client.kycStatus === 'verified' ? 'default' : 'secondary'}>
                {client.kycStatus}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Account Status</span>
              <Badge variant={client.isActive ? 'default' : 'destructive'}>
                {client.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Assigned Agent</span>
              <Select
                value={client.assignedAgentId || 'none'}
                onValueChange={(value) => assignMutation.mutate({
                  assignedAgentId: value === 'none' ? null : value
                })}
                disabled={assignMutation.isPending}
              >
                <SelectTrigger className="w-[160px]" data-testid="select-assigned-agent">
                  <SelectValue />
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Assigned Team</span>
              <Select
                value={client.teamId || 'none'}
                onValueChange={(value) => assignMutation.mutate({
                  teamId: value === 'none' ? null : value
                })}
                disabled={assignMutation.isPending}
              >
                <SelectTrigger className="w-[160px]" data-testid="select-assigned-team">
                  <SelectValue />
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next Follow-up</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={client.nextFollowUpDate ? new Date(client.nextFollowUpDate).toISOString().slice(0, 10) : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        // Parse as local date and convert to ISO string for storage
                        const localDate = new Date(value + 'T00:00:00');
                        apiRequest('PATCH', `/api/clients/${clientId}`, {
                          nextFollowUpDate: localDate.toISOString()
                        }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
                          toast({
                            title: "Follow-up date set",
                            description: "Next follow-up date has been set.",
                          });
                        }).catch(() => {
                          toast({
                            title: "Error",
                            description: "Failed to update follow-up date.",
                            variant: "destructive",
                          });
                        });
                      } else {
                        apiRequest('PATCH', `/api/clients/${clientId}`, {
                          nextFollowUpDate: null
                        }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
                          toast({
                            title: "Follow-up date cleared",
                            description: "Next follow-up date has been cleared.",
                          });
                        }).catch(() => {
                          toast({
                            title: "Error",
                            description: "Failed to clear follow-up date.",
                            variant: "destructive",
                          });
                        });
                      }
                    }}
                    className="w-[140px] h-8 text-xs"
                    data-testid="input-next-followup-date"
                  />
                  {client.nextFollowUpDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        apiRequest('PATCH', `/api/clients/${clientId}`, {
                          nextFollowUpDate: null
                        }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
                          toast({
                            title: "Follow-up date cleared",
                            description: "Next follow-up date has been removed.",
                          });
                        }).catch(() => {
                          toast({
                            title: "Error",
                            description: "Failed to clear follow-up date.",
                            variant: "destructive",
                          });
                        });
                      }}
                      data-testid="button-clear-followup-date"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account Summary</CardTitle>
            <Dialog open={adjustBalanceDialogOpen} onOpenChange={(open) => {
              setAdjustBalanceDialogOpen(open);
              if (!open) {
                setAdjustAmount('');
                setAdjustFundType('real');
                setAdjustNotes('');
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="button-adjust-balance" className="hover-elevate active-elevate-2">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Adjust Balance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adjust Account Balance</DialogTitle>
                  <DialogDescription>
                    Adjust account balance by fund type. Positive amount for credit, negative for debit.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="adjust-amount">Amount</Label>
                    <Input
                      id="adjust-amount"
                      type="number"
                      step="0.01"
                      placeholder="100.00 or -50.00"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      data-testid="input-adjust-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fund-type">Fund Type</Label>
                    <Select value={adjustFundType} onValueChange={(value: 'real' | 'demo' | 'bonus') => setAdjustFundType(value)}>
                      <SelectTrigger id="fund-type" data-testid="select-fund-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real">Real</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                        <SelectItem value="bonus">Bonus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adjust-notes">Notes/Reason</Label>
                    <Textarea
                      id="adjust-notes"
                      placeholder="Enter reason for balance adjustment..."
                      value={adjustNotes}
                      onChange={(e) => setAdjustNotes(e.target.value)}
                      data-testid="textarea-adjust-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (!adjustAmount || parseFloat(adjustAmount) === 0) {
                        toast({
                          title: "Invalid amount",
                          description: "Please enter a valid amount.",
                          variant: "destructive",
                        });
                        return;
                      }
                      adjustBalanceMutation.mutate({
                        amount: adjustAmount,
                        fundType: adjustFundType,
                        notes: adjustNotes,
                      });
                    }}
                    disabled={adjustBalanceMutation.isPending}
                    data-testid="button-save-adjustment"
                  >
                    {adjustBalanceMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={modifyPositionDialogOpen} onOpenChange={(open) => {
              setModifyPositionDialogOpen(open);
              if (!open) {
                setSelectedPosition(null);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modify Position</DialogTitle>
                  <DialogDescription>
                    Edit position details: {selectedPosition?.symbol} ({selectedPosition?.id})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="modify-side">Type</Label>
                    <Select value={modifySide} onValueChange={(value: 'buy' | 'sell') => setModifySide(value)}>
                      <SelectTrigger id="modify-side" data-testid="select-modify-side">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modify-quantity">Volume (Lot)</Label>
                    <Input
                      id="modify-quantity"
                      type="number"
                      step="0.01"
                      placeholder="1.00"
                      value={modifyQuantity}
                      onChange={(e) => setModifyQuantity(e.target.value)}
                      data-testid="input-modify-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modify-open-price">Open Price</Label>
                    <Input
                      id="modify-open-price"
                      type="number"
                      step="0.00001"
                      placeholder="1.16000"
                      value={modifyOpenPrice}
                      onChange={(e) => setModifyOpenPrice(e.target.value)}
                      data-testid="input-modify-open-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modify-pnl">P/L ($)</Label>
                    <Input
                      id="modify-pnl"
                      type="number"
                      step="0.0001"
                      placeholder="0.0000"
                      value={modifyPnl}
                      onChange={(e) => setModifyPnl(e.target.value)}
                      data-testid="input-modify-pnl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modify-opened-at">Opened Date/Time</Label>
                    <Input
                      id="modify-opened-at"
                      type="datetime-local"
                      value={modifyOpenedAt}
                      onChange={(e) => setModifyOpenedAt(e.target.value)}
                      data-testid="input-modify-opened-at"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      const updates: any = {
                        side: modifySide,
                        quantity: modifyQuantity,
                        openPrice: modifyOpenPrice,
                      };
                      if (modifyPnl) updates.unrealizedPnl = modifyPnl;
                      if (modifyOpenedAt) updates.openedAt = new Date(modifyOpenedAt).toISOString();
                      
                      modifyPositionMutation.mutate(updates);
                    }}
                    disabled={modifyPositionMutation.isPending}
                    data-testid="button-save-position"
                  >
                    {modifyPositionMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Balance</span>
              <span className="text-sm font-mono font-medium" data-testid="text-account-balance">
                ${(client.account?.balance || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 items-center" data-testid="fund-breakdown">
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                Real: ${(client.account?.realBalance || 0).toLocaleString()}
              </Badge>
              <span className="text-muted-foreground">|</span>
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                Demo: ${(client.account?.demoBalance || 0).toLocaleString()}
              </Badge>
              <span className="text-muted-foreground">|</span>
              <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700">
                Bonus: ${(client.account?.bonusBalance || 0).toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Equity</span>
              <span className="text-sm font-mono font-medium">
                ${(client.account?.equity || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Margin</span>
              <span className="text-sm font-mono">
                ${(client.account?.margin || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Leverage</span>
              <Select
                value={client.account?.leverage?.toString() || '100'}
                onValueChange={(value) => updateLeverageMutation.mutate(parseInt(value))}
                disabled={updateLeverageMutation.isPending}
              >
                <SelectTrigger className="w-[100px]" data-testid="select-leverage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1:1</SelectItem>
                  <SelectItem value="10">1:10</SelectItem>
                  <SelectItem value="20">1:20</SelectItem>
                  <SelectItem value="50">1:50</SelectItem>
                  <SelectItem value="100">1:100</SelectItem>
                  <SelectItem value="200">1:200</SelectItem>
                  <SelectItem value="500">1:500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions" className="w-full">
        <TabsList>
          <TabsTrigger value="positions" data-testid="tab-positions">Positions</TabsTrigger>
          <TabsTrigger value="subaccounts" data-testid="tab-subaccounts">Subaccounts</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="transfers" data-testid="tab-transfers">Transfer History</TabsTrigger>
          <TabsTrigger value="comments" data-testid="tab-comments">Comments</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Open Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>P/L</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.positions?.length > 0 ? (
                    client.positions.map((position: any) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={position.side === 'buy' ? 'default' : 'destructive'}>
                            {position.side}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{position.quantity}</TableCell>
                        <TableCell className="font-mono">{position.openPrice}</TableCell>
                        <TableCell className="font-mono">{position.currentPrice || '-'}</TableCell>
                        <TableCell>
                          <span className={`font-mono font-medium ${
                            (position.unrealizedPnl || 0) >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            ${Number(position.unrealizedPnl || 0).toFixed(4)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {position.openedAt ? format(new Date(position.openedAt), 'MMM d, HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedPosition(position);
                                setModifyOpenPrice(position.openPrice);
                                setModifyQuantity(position.quantity);
                                setModifySide(position.side);
                                setModifyPnl(position.unrealizedPnl || '');
                                // Format datetime for datetime-local input
                                if (position.openedAt) {
                                  const date = new Date(position.openedAt);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const hours = String(date.getHours()).padStart(2, '0');
                                  const minutes = String(date.getMinutes()).padStart(2, '0');
                                  setModifyOpenedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
                                }
                                setModifyPositionDialogOpen(true);
                              }}
                              data-testid={`button-modify-position-${position.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => closePositionMutation.mutate({ id: position.id, quantity: position.quantity })}
                              disabled={closePositionMutation.isPending}
                              data-testid={`button-close-position-${position.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete position ${position.symbol}?`)) {
                                  deletePositionMutation.mutate(position.id);
                                }
                              }}
                              disabled={deletePositionMutation.isPending}
                              data-testid={`button-delete-position-${position.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No open positions</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subaccounts" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">Subaccounts</CardTitle>
              <div className="flex gap-2">
                <Dialog open={transferDialogOpen} onOpenChange={(open) => {
                  setTransferDialogOpen(open);
                  if (!open) {
                    // Reset form state when dialog closes
                    setTransferFromSubaccountId('');
                    setTransferToSubaccountId('');
                    setTransferAmount('');
                    setTransferNotes('');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="button-internal-transfer" disabled={subaccounts.length < 2}>
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Internal Transfer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Internal Transfer</DialogTitle>
                      <DialogDescription>
                        Transfer funds between subaccounts within this client's account.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="from-subaccount">From Subaccount</Label>
                        <Select value={transferFromSubaccountId} onValueChange={setTransferFromSubaccountId}>
                          <SelectTrigger id="from-subaccount" data-testid="select-from-subaccount">
                            <SelectValue placeholder="Select source subaccount" />
                          </SelectTrigger>
                          <SelectContent>
                            {subaccounts.map((sub: any) => (
                              <SelectItem key={sub.id} value={sub.id} disabled={sub.id === transferToSubaccountId}>
                                {sub.name} ({sub.currency}) - ${(sub.balance || 0).toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="to-subaccount">To Subaccount</Label>
                        <Select value={transferToSubaccountId} onValueChange={setTransferToSubaccountId}>
                          <SelectTrigger id="to-subaccount" data-testid="select-to-subaccount">
                            <SelectValue placeholder="Select destination subaccount" />
                          </SelectTrigger>
                          <SelectContent>
                            {subaccounts.map((sub: any) => (
                              <SelectItem key={sub.id} value={sub.id} disabled={sub.id === transferFromSubaccountId}>
                                {sub.name} ({sub.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transfer-amount">Amount</Label>
                        <Input
                          id="transfer-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          data-testid="input-transfer-amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transfer-notes">Notes (Optional)</Label>
                        <Textarea
                          id="transfer-notes"
                          placeholder="Add any notes about this transfer..."
                          value={transferNotes}
                          onChange={(e) => setTransferNotes(e.target.value)}
                          data-testid="textarea-transfer-notes"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setTransferDialogOpen(false)}
                        data-testid="button-cancel-transfer"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          const amount = Number(transferAmount);
                          if (transferFromSubaccountId && transferToSubaccountId && Number.isFinite(amount) && amount > 0) {
                            transferMutation.mutate({
                              fromSubaccountId: transferFromSubaccountId,
                              toSubaccountId: transferToSubaccountId,
                              amount: transferAmount,
                              notes: transferNotes || undefined,
                            });
                          } else if (amount <= 0 || !Number.isFinite(amount)) {
                            toast({
                              title: "Invalid amount",
                              description: "Please enter a valid amount greater than zero.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!transferFromSubaccountId || !transferToSubaccountId || !transferAmount || Number(transferAmount) <= 0 || transferMutation.isPending}
                        data-testid="button-confirm-transfer"
                      >
                        {transferMutation.isPending ? 'Processing...' : 'Transfer Funds'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={createSubaccountOpen} onOpenChange={setCreateSubaccountOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-create-subaccount">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Subaccount
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Subaccount</DialogTitle>
                    <DialogDescription>
                      Create a new subaccount for managing separate balances and positions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="subaccount-name">Subaccount Name</Label>
                      <Input
                        id="subaccount-name"
                        placeholder="e.g., Trading Account A"
                        value={newSubaccountName}
                        onChange={(e) => setNewSubaccountName(e.target.value)}
                        data-testid="input-subaccount-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subaccount-currency">Currency</Label>
                      <Select value={newSubaccountCurrency} onValueChange={setNewSubaccountCurrency}>
                        <SelectTrigger id="subaccount-currency" data-testid="select-subaccount-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateSubaccountOpen(false)}
                      data-testid="button-cancel-subaccount"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (client?.account?.id) {
                          createSubaccountMutation.mutate({
                            accountId: client.account.id,
                            name: newSubaccountName,
                            currency: newSubaccountCurrency,
                          });
                        }
                      }}
                      disabled={!newSubaccountName.trim() || createSubaccountMutation.isPending}
                      data-testid="button-confirm-create-subaccount"
                    >
                      Create Subaccount
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Equity</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subaccounts.length > 0 ? (
                    subaccounts.map((subaccount: any) => (
                      <TableRow key={subaccount.id} data-testid={`subaccount-row-${subaccount.id}`}>
                        <TableCell className="font-medium" data-testid="text-subaccount-name">
                          {subaccount.name}
                        </TableCell>
                        <TableCell className="font-mono">{subaccount.currency}</TableCell>
                        <TableCell className="font-mono font-medium">
                          ${(subaccount.balance || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">
                          ${(subaccount.equity || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">
                          ${(subaccount.margin || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={subaccount.isActive ? 'default' : 'secondary'}>
                            {subaccount.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {subaccount.isDefault && (
                            <Check className="h-4 w-4 text-success" data-testid="icon-default-subaccount" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No subaccounts yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Create a subaccount to manage separate balances and positions
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Fund Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.transactions?.length > 0 ? (
                    client.transactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-sm">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'deposit' ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              transaction.fundType === 'real'
                                ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20'
                                : transaction.fundType === 'demo'
                                ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20'
                                : 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20'
                            }
                            data-testid={`badge-fundtype-${transaction.id}`}
                          >
                            {transaction.fundType ? transaction.fundType.charAt(0).toUpperCase() + transaction.fundType.slice(1) : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          ${transaction.amount}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.method || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No transactions</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">Internal Transfer History</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Export filtered transfers to CSV
                    const headers = ['Date', 'From Subaccount', 'To Subaccount', 'Amount', 'Status', 'Notes'];
                    const csvData = filteredTransfers.map((transfer: any) => {
                    const fromSub = subaccounts.find((s: any) => s.id === transfer.fromSubaccountId);
                    const toSub = subaccounts.find((s: any) => s.id === transfer.toSubaccountId);
                    return [
                      new Date(transfer.createdAt).toLocaleString(),
                      fromSub?.name || transfer.fromSubaccountId,
                      toSub?.name || transfer.toSubaccountId,
                      transfer.amount,
                      transfer.status,
                      transfer.notes || '',
                    ].map(val => `"${val}"`).join(',');
                  });
                  const csv = [headers.join(','), ...csvData].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `transfer-history-${client.firstName}-${client.lastName}-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                data-testid="button-export-transfers"
              >
                Export to CSV
              </Button>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Label htmlFor="filter-subaccount" className="text-sm">Filter by Subaccount</Label>
                  <Select value={filterSubaccount} onValueChange={setFilterSubaccount}>
                    <SelectTrigger id="filter-subaccount" data-testid="select-filter-subaccount">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subaccounts</SelectItem>
                      {subaccounts.map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name} ({sub.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="filter-date-from" className="text-sm">From Date</Label>
                  <Input
                    id="filter-date-from"
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    data-testid="input-filter-date-from"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="filter-date-to" className="text-sm">To Date</Label>
                  <Input
                    id="filter-date-to"
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    data-testid="input-filter-date-to"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length > 0 ? (
                    filteredTransfers.map((transfer: any) => {
                      const fromSub = subaccounts.find((s: any) => s.id === transfer.fromSubaccountId);
                      const toSub = subaccounts.find((s: any) => s.id === transfer.toSubaccountId);
                      return (
                        <TableRow key={transfer.id} data-testid={`transfer-row-${transfer.id}`}>
                          <TableCell className="text-sm" data-testid="text-transfer-date">
                            {new Date(transfer.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{fromSub?.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{fromSub?.currency}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{toSub?.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{toSub?.currency}</div>
                          </TableCell>
                          <TableCell className="font-mono font-medium" data-testid="text-transfer-amount">
                            ${transfer.amount}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                transfer.status === 'completed' ? 'default' : 
                                transfer.status === 'rejected' ? 'destructive' : 
                                'secondary'
                              }
                              data-testid="badge-transfer-status"
                            >
                              {transfer.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate" data-testid="text-transfer-notes">
                            {transfer.notes || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No internal transfers</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Transfers between subaccounts will appear here
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  data-testid="input-new-comment"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => addCommentMutation.mutate(newComment)}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-add-comment"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                {comments.length > 0 ? (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="p-4 border rounded-md space-y-2" data-testid={`comment-${comment.id}`}>
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {comment.user?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium" data-testid="text-comment-user">
                              {comment.user?.name || 'Unknown User'}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid="text-comment-timestamp">
                              {new Date(comment.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {editingCommentId === comment.id ? (
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              rows={3}
                              data-testid="input-edit-comment"
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap" data-testid="text-comment-content">
                              {comment.comment}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {editingCommentId === comment.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  updateCommentMutation.mutate({
                                    id: comment.id,
                                    comment: editingCommentText,
                                  });
                                }}
                                disabled={updateCommentMutation.isPending}
                                data-testid="button-save-comment"
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText('');
                                }}
                                data-testid="button-cancel-edit"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.comment);
                                }}
                                data-testid="button-edit-comment"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCommentMutation.mutate(comment.id)}
                                disabled={deleteCommentMutation.isPending}
                                data-testid="button-delete-comment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span data-testid="text-comment-author">{comment.user?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span data-testid="text-comment-date">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                        {comment.updatedAt !== comment.createdAt && (
                          <>
                            <span>•</span>
                            <span className="italic">edited</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  // Combine all activities
                  const activities: any[] = [];
                  
                  // Add comments
                  comments.forEach((comment: any) => {
                    activities.push({
                      type: 'comment',
                      timestamp: new Date(comment.createdAt),
                      data: comment,
                    });
                  });
                  
                  // Add positions
                  client.positions?.forEach((position: any) => {
                    activities.push({
                      type: 'position',
                      timestamp: new Date(position.openTime),
                      data: position,
                    });
                  });
                  
                  // Add transactions
                  client.transactions?.forEach((transaction: any) => {
                    activities.push({
                      type: 'transaction',
                      timestamp: new Date(transaction.createdAt),
                      data: transaction,
                    });
                  });
                  
                  // Sort by timestamp (newest first)
                  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                  
                  if (activities.length === 0) {
                    return <p className="text-sm text-muted-foreground">No activity yet</p>;
                  }
                  
                  return activities.map((activity, index) => (
                    <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0" data-testid={`activity-${activity.type}-${index}`}>
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          activity.type === 'comment' ? 'bg-blue-100 dark:bg-blue-900' :
                          activity.type === 'position' ? 'bg-green-100 dark:bg-green-900' :
                          'bg-purple-100 dark:bg-purple-900'
                        }`}>
                          {activity.type === 'comment' && <FileText className="h-4 w-4 text-blue-600 dark:text-blue-300" />}
                          {activity.type === 'position' && <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-300" />}
                          {activity.type === 'transaction' && <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-300" />}
                        </div>
                        {index < activities.length - 1 && (
                          <div className="w-px h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">
                            {activity.type === 'comment' && 'Comment Added'}
                            {activity.type === 'position' && `${activity.data.type === 'buy' ? 'Opened Long' : 'Opened Short'} Position`}
                            {activity.type === 'transaction' && `${activity.data.type === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.timestamp.toLocaleString()}
                          </p>
                        </div>
                        {activity.type === 'comment' && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              by {activity.data.user?.name || 'Unknown User'}
                            </p>
                            <p className="text-sm">{activity.data.comment}</p>
                          </div>
                        )}
                        {activity.type === 'position' && (
                          <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">Symbol:</span> {activity.data.symbol}</p>
                            <p><span className="text-muted-foreground">Volume:</span> {activity.data.volume}</p>
                            <p><span className="text-muted-foreground">Entry Price:</span> ${activity.data.openPrice}</p>
                            {activity.data.status === 'closed' && (
                              <p><span className="text-muted-foreground">P/L:</span> ${activity.data.profitLoss}</p>
                            )}
                          </div>
                        )}
                        {activity.type === 'transaction' && (
                          <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">Amount:</span> ${activity.data.amount}</p>
                            <p><span className="text-muted-foreground">Status:</span> <Badge variant={activity.data.status === 'completed' ? 'default' : 'secondary'}>{activity.data.status}</Badge></p>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KYC Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {client.kycDocuments?.length > 0 ? (
                  client.kycDocuments.map((doc: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md hover-elevate">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{doc.name || `Document ${index + 1}`}</span>
                      </div>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Client Dialog */}
      <Dialog open={clientTransferDialogOpen} onOpenChange={setClientTransferDialogOpen}>
        <DialogContent data-testid="dialog-transfer-client">
          <DialogHeader>
            <DialogTitle>Transfer Client</DialogTitle>
            <DialogDescription>
              Transfer this client to a different agent or team. The client's status will automatically change to "Reassigned".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-agent">New Agent</Label>
              <Select
                value={transferNewAgentId}
                onValueChange={setTransferNewAgentId}
              >
                <SelectTrigger id="transfer-agent" data-testid="select-transfer-agent">
                  <SelectValue placeholder="Select new agent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-team">New Team</Label>
              <Select
                value={transferNewTeamId}
                onValueChange={setTransferNewTeamId}
              >
                <SelectTrigger id="transfer-team" data-testid="select-transfer-team">
                  <SelectValue placeholder="Select new team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-reason">Transfer Reason *</Label>
              <Textarea
                id="transfer-reason"
                placeholder="Explain why this client is being transferred..."
                value={clientTransferReason}
                onChange={(e) => setClientTransferReason(e.target.value)}
                rows={4}
                data-testid="textarea-transfer-reason"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be logged in the audit trail and added as a comment.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setClientTransferDialogOpen(false);
                setTransferNewAgentId('');
                setTransferNewTeamId('');
                setClientTransferReason('');
              }}
              data-testid="button-cancel-transfer"
              className="hover-elevate active-elevate-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClientTransfer}
              disabled={clientTransferMutation.isPending || !clientTransferReason.trim() || (!transferNewAgentId && !transferNewTeamId)}
              data-testid="button-confirm-transfer"
              className="hover-elevate active-elevate-2"
            >
              {clientTransferMutation.isPending ? "Transferring..." : "Transfer Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Comment Dialog */}
      <Dialog open={quickCommentDialogOpen} onOpenChange={setQuickCommentDialogOpen}>
        <DialogContent data-testid="dialog-quick-comment">
          <DialogHeader>
            <DialogTitle>Add Quick Comment</DialogTitle>
            <DialogDescription>
              Add a quick note or comment about this client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-comment">Comment *</Label>
              <Textarea
                id="quick-comment"
                placeholder="Enter your comment..."
                value={quickComment}
                onChange={(e) => setQuickComment(e.target.value)}
                rows={4}
                data-testid="textarea-quick-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuickCommentDialogOpen(false);
                setQuickComment('');
              }}
              data-testid="button-cancel-quick-comment"
              className="hover-elevate active-elevate-2"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!quickComment.trim()) {
                  toast({
                    title: "Error",
                    description: "Please enter a comment.",
                    variant: "destructive",
                  });
                  return;
                }
                addCommentMutation.mutate(quickComment);
              }}
              disabled={addCommentMutation.isPending}
              data-testid="button-submit-quick-comment"
              className="hover-elevate active-elevate-2"
            >
              {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
