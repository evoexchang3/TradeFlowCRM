import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, DollarSign, MessageSquare, Phone, Mail, MoreVertical, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  icon?: string;
  category: string;
}

export default function SalesClients() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [filterAgentId, setFilterAgentId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [markFTDOpen, setMarkFTDOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState<string>('');
  const [bulkAssignTeamId, setBulkAssignTeamId] = useState<string>('');
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedClientForComment, setSelectedClientForComment] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const { toast } = useToast();

  const markFTDSchema = z.object({
    amount: z.string().min(1, t('clients.sales.validation.amount.required')).refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      t('clients.sales.validation.amount.positive')
    ),
    fundType: z.enum(['real', 'demo', 'bonus']),
    notes: z.string().optional(),
  });

  const form = useForm<z.infer<typeof markFTDSchema>>({
    resolver: zodResolver(markFTDSchema),
    defaultValues: {
      amount: "",
      fundType: 'real',
      notes: "",
    },
  });
  
  const { data: salesClients, isLoading } = useQuery({
    queryKey: ['/api/clients/sales'],
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

  const clients = salesClients?.filter((client: any) => {
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

    return true;
  });

  const markFTDMutation = useMutation({
    mutationFn: (data: { amount: string; fundType: string; notes?: string }) =>
      apiRequest('POST', `/api/clients/${selectedClient?.id}/mark-ftd`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients/retention'] });
      setMarkFTDOpen(false);
      setSelectedClient(null);
      form.reset();
      toast({
        title: t('clients.sales.toast.ftd.success'),
        description: t('clients.sales.toast.ftd.success.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('clients.sales.toast.ftd.error'),
        description: error.message || t('clients.sales.toast.ftd.error.description'),
        variant: "destructive",
      });
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (data: { clientIds: string[]; assignedAgentId?: string | null; teamId?: string | null }) =>
      apiRequest('POST', '/api/clients/bulk-assign', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/sales'] });
      setSelectedClients(new Set());
      setBulkAssignOpen(false);
      setBulkAssignAgentId('');
      setBulkAssignTeamId('');
      toast({
        title: t('clients.sales.toast.bulk.assign.success'),
        description: t('clients.sales.toast.bulk.assign.success.description', { count: selectedClients.size }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('clients.sales.toast.bulk.assign.error'),
        description: error.message || t('clients.sales.toast.bulk.assign.error.description'),
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ clientId, comment }: { clientId: string; comment: string }) =>
      apiRequest('POST', `/api/clients/${clientId}/comments`, { text: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/sales'] });
      setCommentDialogOpen(false);
      setCommentText('');
      setSelectedClientForComment(null);
      toast({
        title: t('clients.sales.toast.comment.success'),
        description: t('clients.sales.toast.comment.success.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clients.sales.toast.comment.error.description'),
        variant: "destructive",
      });
    },
  });

  const assignAgentMutation = useMutation({
    mutationFn: ({ clientId, assignedAgentId }: { clientId: string; assignedAgentId: string | null }) =>
      apiRequest('PATCH', `/api/clients/${clientId}`, { assignedAgentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/sales'] });
      toast({
        title: t('clients.sales.toast.agent.success'),
        description: t('clients.sales.toast.agent.success.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clients.sales.toast.agent.error.description'),
        variant: "destructive",
      });
    },
  });

  const updateCustomStatusMutation = useMutation({
    mutationFn: ({ clientId, statusId }: { clientId: string; statusId: string | null }) =>
      apiRequest('PATCH', `/api/clients/${clientId}`, { statusId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/sales'] });
      toast({
        title: t('clients.sales.toast.status.success'),
        description: t('clients.sales.toast.status.success.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clients.sales.toast.status.error.description'),
        variant: "destructive",
      });
    },
  });

  const updateKycStatusMutation = useMutation({
    mutationFn: ({ clientId, kycStatus }: { clientId: string; kycStatus: string }) =>
      apiRequest('PATCH', `/api/clients/${clientId}/kyc`, { kycStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/sales'] });
      toast({
        title: t('clients.sales.toast.kyc.success'),
        description: t('clients.sales.toast.kyc.success.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('clients.sales.toast.kyc.error.description'),
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

  const onSubmitFTD = (values: z.infer<typeof markFTDSchema>) => {
    markFTDMutation.mutate(values);
  };

  const getPipelineStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      new_lead: { label: t('clients.sales.pipeline.new.lead'), variant: 'default' },
      contact_attempted: { label: t('clients.sales.pipeline.contact.attempted'), variant: 'secondary' },
      in_discussion: { label: t('clients.sales.pipeline.in.discussion'), variant: 'default' },
      kyc_pending: { label: t('clients.sales.pipeline.kyc.pending'), variant: 'secondary' },
      active_client: { label: t('clients.sales.pipeline.active'), variant: 'default' },
      cold_inactive: { label: t('clients.sales.pipeline.cold.inactive'), variant: 'outline' },
      lost: { label: t('clients.sales.pipeline.lost'), variant: 'destructive' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant} data-testid={`badge-pipeline-status-${status}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('clients.sales.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('clients.sales.title')}</h1>
          <p className="text-muted-foreground">
            {t('clients.sales.subtitle')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-stats-title">{t('clients.sales.pipeline.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('clients.sales.total.clients')}</p>
              <p className="text-2xl font-bold" data-testid="text-total-clients">{clients?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('clients.sales.new.leads')}</p>
              <p className="text-2xl font-bold" data-testid="text-new-leads">
                {clients?.filter((c: any) => c.pipelineStatus === 'new_lead').length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('clients.sales.in.discussion')}</p>
              <p className="text-2xl font-bold" data-testid="text-in-discussion">
                {clients?.filter((c: any) => c.pipelineStatus === 'in_discussion').length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('clients.sales.kyc.pending')}</p>
              <p className="text-2xl font-bold" data-testid="text-kyc-pending">
                {clients?.filter((c: any) => c.pipelineStatus === 'kyc_pending').length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('clients.sales.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterTeamId} onValueChange={setFilterTeamId}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-team-filter">
                <SelectValue placeholder={t('clients.sales.all.teams')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('clients.sales.all.teams')}</SelectItem>
                {teams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAgentId} onValueChange={setFilterAgentId}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-agent-filter">
                <SelectValue placeholder={t('clients.sales.all.agents')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('clients.sales.all.agents')}</SelectItem>
                <SelectItem value="unassigned">{t('clients.sales.unassigned')}</SelectItem>
                {agents.map((agent: any) => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder={t('clients.sales.all.statuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('clients.sales.all.statuses')}</SelectItem>
                {customStatuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterTeamId !== 'all' || filterAgentId !== 'all' || filterStatus !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterTeamId('all');
                  setFilterAgentId('all');
                  setFilterStatus('all');
                  setSearchQuery('');
                }}
                data-testid="button-clear-filters"
                className="hover-elevate active-elevate-2"
              >
                {t('clients.sales.clear.filters')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {selectedClients.size > 0 && (
            <div className="flex items-center justify-between p-3 mb-4 bg-primary/10 rounded-md border border-primary/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium" data-testid="text-selected-count">
                  {t('clients.sales.selected.count', { 
                    count: selectedClients.size,
                    s: selectedClients.size > 1 ? t('clients.sales.selected.plural') : ''
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
                  {t('clients.sales.clear.selection')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBulkAssignOpen(true)}
                  data-testid="button-bulk-assign"
                  className="hover-elevate active-elevate-2"
                >
                  {t('clients.sales.assign.clients')}
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
                <TableHead>{t('clients.sales.table.client')}</TableHead>
                <TableHead>{t('clients.sales.table.contact')}</TableHead>
                <TableHead>{t('clients.sales.table.status')}</TableHead>
                <TableHead>{t('clients.sales.table.kyc')}</TableHead>
                <TableHead>{t('clients.sales.table.agent')}</TableHead>
                <TableHead>{t('clients.sales.table.team')}</TableHead>
                <TableHead className="w-[140px]">{t('clients.sales.table.actions')}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients && clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-clients">{t('clients.sales.no.clients')}</p>
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
                            <SelectValue placeholder={t('clients.sales.select.status')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('common.none')}</SelectItem>
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
                            <SelectValue placeholder={t('clients.sales.table.kyc')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">{t('clients.sales.kyc.pending.option')}</SelectItem>
                            <SelectItem value="verified">{t('clients.sales.kyc.verified')}</SelectItem>
                            <SelectItem value="rejected">{t('clients.sales.kyc.rejected')}</SelectItem>
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
                            <SelectValue placeholder={t('clients.sales.unassigned')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">{t('clients.sales.unassigned')}</SelectItem>
                            {agents.map((agent: any) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell data-testid={`text-team-${client.id}`}>
                        <span className="text-sm">{team?.name || t('clients.sales.unassigned')}</span>
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
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setMarkFTDOpen(true);
                            }}
                            data-testid={`button-mark-ftd-${client.id}`}
                            className="h-8"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            {t('clients.sales.ftd.button')}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${client.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}`}>{t('clients.sales.view.details')}</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}/edit`}>{t('clients.sales.edit.client')}</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/chat?clientId=${client.id}`}>{t('clients.sales.start.chat')}</Link>
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

      <Dialog open={markFTDOpen} onOpenChange={setMarkFTDOpen}>
        <DialogContent data-testid="dialog-mark-ftd">
          <DialogHeader>
            <DialogTitle>{t('clients.sales.mark.ftd.title')}</DialogTitle>
            <DialogDescription>
              {t('clients.sales.mark.ftd.description', { name: selectedClient?.name })}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitFTD)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clients.sales.deposit.amount')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t('clients.sales.amount.placeholder')}
                        data-testid="input-ftd-amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fundType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clients.sales.fund.type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fund-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="real">{t('clients.sales.fund.real')}</SelectItem>
                        <SelectItem value="demo">{t('clients.sales.fund.demo')}</SelectItem>
                        <SelectItem value="bonus">{t('clients.sales.fund.bonus')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clients.sales.notes.optional')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('clients.sales.notes.placeholder')}
                        data-testid="input-ftd-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMarkFTDOpen(false);
                    form.reset();
                  }}
                  data-testid="button-cancel-ftd"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={markFTDMutation.isPending}
                  data-testid="button-confirm-ftd"
                >
                  {markFTDMutation.isPending ? t('clients.sales.processing') : t('clients.sales.mark.ftd')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent data-testid="dialog-bulk-assign">
          <DialogHeader>
            <DialogTitle>{t('clients.sales.bulk.assign.title')}</DialogTitle>
            <DialogDescription>
              {t('clients.sales.bulk.assign.description', { 
                count: selectedClients.size,
                s: selectedClients.size > 1 ? t('clients.sales.selected.plural') : ''
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('clients.sales.assign.to.agent')}</label>
              <Select value={bulkAssignAgentId} onValueChange={setBulkAssignAgentId}>
                <SelectTrigger data-testid="select-bulk-agent">
                  <SelectValue placeholder={t('clients.sales.select.agent.optional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('clients.sales.remove.agent')}</SelectItem>
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('clients.sales.assign.to.team')}</label>
              <Select value={bulkAssignTeamId} onValueChange={setBulkAssignTeamId}>
                <SelectTrigger data-testid="select-bulk-team">
                  <SelectValue placeholder={t('clients.sales.select.team.optional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('clients.sales.remove.team')}</SelectItem>
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssignMutation.isPending || (!bulkAssignAgentId && !bulkAssignTeamId)}
              data-testid="button-confirm-bulk-assign"
            >
              {bulkAssignMutation.isPending ? t('clients.sales.assigning') : t('clients.sales.assign.clients')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent data-testid="dialog-add-comment">
          <DialogHeader>
            <DialogTitle>{t('clients.sales.add.comment.title')}</DialogTitle>
            <DialogDescription>
              {t('clients.sales.add.comment.description', { name: selectedClientForComment?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('clients.sales.enter.comment')}
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
              {t('common.cancel')}
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
              {commentMutation.isPending ? t('clients.sales.saving') : t('clients.sales.save.comment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
