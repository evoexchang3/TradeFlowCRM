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
import { useLanguage } from "@/contexts/LanguageContext";
import type { Client, Team, User, CustomStatus, Role } from "@shared/schema";
import { EmailComposeDialog } from "@/components/email-compose-dialog";

interface UserWithRole extends User {
  role?: Role;
}

export default function Clients() {
  const { t } = useLanguage();
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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedClientForEmail, setSelectedClientForEmail] = useState<any>(null);
  const { toast } = useToast();
  
  const { data: currentUser } = useQuery<UserWithRole>({
    queryKey: ['/api/auth/me'],
  });
  
  const { data: allClients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const { data: agents = [] } = useQuery<User[]>({
    queryKey: ['/api/users/agents'],
  });

  const { data: customStatuses = [] } = useQuery<CustomStatus[]>({
    queryKey: ['/api/custom-statuses'],
  });

  const clients = allClients?.filter((client: any) => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch = 
        client.firstName?.toLowerCase().includes(search) ||
        client.lastName?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.id?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    if (filterTeamId && filterTeamId !== 'all') {
      if (filterTeamId === 'unassigned') {
        if (client.teamId) return false;
      } else {
        if (client.teamId !== filterTeamId) return false;
      }
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
        title: t('clients.all.toast.bulk.assign.completed'),
        description: t('clients.all.toast.bulk.assign.success', { count: selectedClients.size }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('clients.all.toast.bulk.assign.failed'),
        description: error.message || t('clients.all.toast.failed.assign.clients'),
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
        title: t('clients.all.toast.comment.added'),
        description: t('clients.all.toast.comment.saved'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clients.all.toast.failed.add.comment'),
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
        title: t('clients.all.toast.agent.assigned'),
        description: t('clients.all.toast.agent.updated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clients.all.toast.failed.assign.agent'),
        variant: "destructive",
      });
    },
  });

  const updateCustomStatusMutation = useMutation({
    mutationFn: ({ clientId, statusId }: { clientId: string; statusId: string | null }) =>
      apiRequest('PATCH', `/api/clients/${clientId}`, { statusId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: t('clients.all.toast.status.updated'),
        description: t('clients.all.toast.status.updated.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clients.all.toast.failed.update.status'),
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
        title: t('clients.all.toast.kyc.updated'),
        description: t('clients.all.toast.kyc.updated.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clients.all.toast.failed.update.kyc'),
        variant: "destructive",
      });
    },
  });

  const canAssignAgents = () => {
    if (!currentUser || !currentUser.role) return false;
    const roleName = currentUser.role.name?.toLowerCase();
    // Exclude agents from bulk assignment
    const isAgent = roleName?.includes('agent');
    if (isAgent) return false;
    // Allow administrators, CRM managers, and team leaders
    return roleName === 'administrator' || roleName === 'crm manager' || roleName?.includes('team leader');
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
    // Prevent agents from bulk assigning
    if (!canAssignAgents()) {
      toast({
        title: t('common.error'),
        description: t('common.unauthorized'),
        variant: "destructive",
      });
      return;
    }

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
      verified: { variant: "default", label: t('clients.all.verified') },
      pending: { variant: "secondary", label: t('clients.all.pending') },
      rejected: { variant: "destructive", label: t('clients.all.rejected') },
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
      new_lead: { variant: "default", label: t('clients.all.pipeline.new.lead') },
      contact_attempted: { variant: "secondary", label: t('clients.all.pipeline.contact.attempted') },
      in_discussion: { variant: "secondary", label: t('clients.all.pipeline.in.discussion') },
      kyc_pending: { variant: "secondary", label: t('clients.all.pipeline.kyc.pending') },
      active_client: { variant: "default", label: t('clients.all.pipeline.active.client') },
      cold_inactive: { variant: "secondary", label: t('clients.all.pipeline.cold.inactive') },
      lost: { variant: "destructive", label: t('clients.all.pipeline.lost') },
    };
    const config = variants[status] || { variant: "secondary", label: t('clients.all.pipeline.unknown') };
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
          <h1 className="text-2xl font-semibold" data-testid="text-clients-title">{t('clients.all.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('clients.all.subtitle')}
          </p>
        </div>
        <Button asChild size="sm" data-testid="button-add-client" className="hover-elevate active-elevate-2">
          <Link href="/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            {t('clients.all.add.client')}
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
                  placeholder={t('clients.all.search.placeholder')}
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
                  <SelectValue placeholder={t('clients.all.all.teams')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('clients.all.all.teams')}</SelectItem>
                  <SelectItem value="unassigned">{t('clients.all.unassigned')}</SelectItem>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAgentId} onValueChange={setFilterAgentId}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-agent">
                  <SelectValue placeholder={t('clients.all.all.agents')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('clients.all.all.agents')}</SelectItem>
                  <SelectItem value="unassigned">{t('clients.all.unassigned')}</SelectItem>
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-status">
                  <SelectValue placeholder={t('clients.all.all.statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('clients.all.all.statuses')}</SelectItem>
                  {customStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
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
                  {t('clients.all.clear.filters')}
                </Button>
              )}
            </div>

            {clients && allClients && clients.length !== allClients.length && (
              <p className="text-sm text-muted-foreground">
                {t('clients.all.showing.count', { current: clients.length, total: allClients.length })}
              </p>
            )}
          </div>

          {selectedClients.size > 0 && canAssignAgents() && (
            <div className="flex items-center justify-between p-3 mb-4 bg-primary/10 rounded-md border border-primary/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium" data-testid="text-selected-count">
                  {t('clients.all.selected.count', { 
                    count: selectedClients.size, 
                    s: selectedClients.size > 1 ? t('clients.all.selected.plural') : '' 
                  })}
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
                  {t('clients.all.clear.selection')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBulkAssignOpen(true)}
                  data-testid="button-bulk-assign"
                  className="hover-elevate active-elevate-2"
                >
                  {t('clients.all.assign.clients')}
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
                  {canAssignAgents() && (
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedClients.size === clients?.length && clients?.length > 0}
                        onCheckedChange={handleToggleAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                  )}
                  <TableHead>{t('clients.all.table.client')}</TableHead>
                  <TableHead>{t('clients.all.table.contact')}</TableHead>
                  <TableHead>{t('clients.all.table.account')}</TableHead>
                  <TableHead>{t('clients.all.table.status')}</TableHead>
                  <TableHead>{t('clients.all.table.kyc.status')}</TableHead>
                  <TableHead>{t('clients.all.table.balance')}</TableHead>
                  <TableHead>{t('clients.all.table.agent')}</TableHead>
                  <TableHead className="w-[140px]">{t('clients.all.table.actions')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((client: any) => (
                  <TableRow key={client.id} className="hover-elevate">
                    {canAssignAgents() && (
                      <TableCell>
                        <Checkbox
                          checked={selectedClients.has(client.id)}
                          onCheckedChange={() => handleToggleClient(client.id)}
                          data-testid={`checkbox-client-${client.id}`}
                        />
                      </TableCell>
                    )}
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
                        {client.account?.accountNumber || t('clients.all.na')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={client.statusId || 'none'}
                        onValueChange={(value) => updateCustomStatusMutation.mutate({
                          clientId: client.id,
                          statusId: value === 'none' ? null : value
                        })}
                      >
                        <SelectTrigger className="w-[150px] h-8 text-xs" data-testid={`select-status-${client.id}`}>
                          <SelectValue placeholder={t('clients.all.select.status')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('clients.all.none')}</SelectItem>
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
                        <SelectTrigger className="w-[120px] h-8 text-xs" data-testid={`select-kyc-${client.id}`}>
                          <SelectValue placeholder={t('clients.all.select.kyc')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('clients.all.pending')}</SelectItem>
                          <SelectItem value="verified">{t('clients.all.verified')}</SelectItem>
                          <SelectItem value="rejected">{t('clients.all.rejected')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono font-medium text-sm" data-testid={`text-client-balance-${client.id}`}>
                          ${(client.account?.balance || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('clients.all.equity')} ${(client.account?.equity || 0).toLocaleString()}
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
                          <SelectValue placeholder={t('clients.all.unassigned.placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">{t('clients.all.unassigned')}</SelectItem>
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
                          onClick={() => {
                            setSelectedClientForEmail(client);
                            setEmailDialogOpen(true);
                          }}
                          data-testid={`button-email-${client.id}`}
                        >
                          <Mail className="h-3 w-3" />
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
                            <Link href={`/clients/${client.id}`}>{t('clients.all.view.details')}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}/edit`}>{t('clients.all.edit.client')}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>{t('clients.all.call.client')}</DropdownMenuItem>
                          <DropdownMenuItem>{t('clients.all.login.as.client')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <p className="text-sm text-muted-foreground">{t('clients.all.no.clients')}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={bulkAssignOpen} onOpenChange={(open) => {
        // Prevent agents from opening bulk assign dialog
        if (open && !canAssignAgents()) return;
        setBulkAssignOpen(open);
      }}>
        <DialogContent data-testid="dialog-bulk-assign">
          <DialogHeader>
            <DialogTitle>{t('clients.all.bulk.assign.title')}</DialogTitle>
            <DialogDescription>
              {t('clients.all.bulk.assign.description', { 
                count: selectedClients.size, 
                s: selectedClients.size > 1 ? t('clients.all.selected.plural') : '' 
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('clients.all.assigned.agent')}</label>
              <Select
                value={bulkAssignAgentId}
                onValueChange={setBulkAssignAgentId}
              >
                <SelectTrigger data-testid="select-bulk-agent">
                  <SelectValue placeholder={t('clients.all.select.agent.optional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('clients.all.unassigned')}</SelectItem>
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('clients.all.assigned.team')}</label>
              <Select
                value={bulkAssignTeamId}
                onValueChange={setBulkAssignTeamId}
              >
                <SelectTrigger data-testid="select-bulk-team">
                  <SelectValue placeholder={t('clients.all.select.team.optional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('clients.all.no.team')}</SelectItem>
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssignMutation.isPending || (!bulkAssignAgentId && !bulkAssignTeamId)}
              data-testid="button-confirm-bulk-assign"
              className="hover-elevate active-elevate-2"
            >
              {bulkAssignMutation.isPending ? t('clients.all.assigning') : t('clients.all.assign.clients')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent data-testid="dialog-add-comment">
          <DialogHeader>
            <DialogTitle>{t('clients.all.add.comment.title')}</DialogTitle>
            <DialogDescription>
              {t('clients.all.add.comment.description', { 
                name: `${selectedClientForComment?.firstName} ${selectedClientForComment?.lastName}` 
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('clients.all.enter.comment')}
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
              {t('common.cancel')}
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
              {commentMutation.isPending ? t('clients.all.saving') : t('clients.all.save.comment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Compose Dialog */}
      {selectedClientForEmail && (
        <EmailComposeDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          client={{
            id: selectedClientForEmail.id,
            email: selectedClientForEmail.email,
            firstName: selectedClientForEmail.firstName,
            lastName: selectedClientForEmail.lastName,
            phone: selectedClientForEmail.phone,
            country: selectedClientForEmail.country,
          }}
        />
      )}
    </div>
  );
}
