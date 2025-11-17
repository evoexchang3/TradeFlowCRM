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
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DocumentManagement } from "@/components/document-management";
import { KycProgress } from "@/components/kyc-progress";

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  icon?: string;
  category: string;
}

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
  const [modifyClosePrice, setModifyClosePrice] = useState('');
  const [modifyQuantity, setModifyQuantity] = useState('');
  const [modifySide, setModifySide] = useState<'buy' | 'sell'>('buy');
  const [modifyPnl, setModifyPnl] = useState('');
  const [modifyOpenedAt, setModifyOpenedAt] = useState('');
  const [modifyClosedAt, setModifyClosedAt] = useState('');
  const [calendarEventDialogOpen, setCalendarEventDialogOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventType, setEventType] = useState<'meeting' | 'call' | 'follow_up' | 'demo' | 'kyc_review'>('call');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [kycFormResponses, setKycFormResponses] = useState<Record<string, string>>({});
  const [kycVerificationNotes, setKycVerificationNotes] = useState('');
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, hasAnyPermission } = useAuth();

  const CLIENT_STATUSES = [
    { value: 'new', label: t('client.status.new') },
    { value: 'reassigned', label: t('client.status.reassigned') },
    { value: 'potential', label: t('client.status.potential') },
    { value: 'low_potential', label: t('client.status.low_potential') },
    { value: 'mid_potential', label: t('client.status.mid_potential') },
    { value: 'high_potential', label: t('client.status.high_potential') },
    { value: 'no_answer', label: t('client.status.no_answer') },
    { value: 'voicemail', label: t('client.status.voicemail') },
    { value: 'callback_requested', label: t('client.status.callback_requested') },
    { value: 'not_interested', label: t('client.status.not_interested') },
    { value: 'converted', label: t('client.status.converted') },
    { value: 'lost', label: t('client.status.lost') },
  ];

  const { data: client, isLoading } = useQuery({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
  });

  const { data: customStatuses = [] } = useQuery<CustomStatus[]>({
    queryKey: ['/api/custom-statuses'],
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

  const { data: closedPositions = [] } = useQuery({
    queryKey: ['/api/clients', clientId, 'closed-positions'],
    enabled: !!clientId,
  });

  const { data: kycQuestions = [] } = useQuery({
    queryKey: ['/api/kyc-questions'],
  });

  const { data: kycResponses = [] } = useQuery({
    queryKey: ['/api/clients', clientId, 'kyc-responses'],
    enabled: !!clientId,
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

  const updateClientStatusMutation = useMutation({
    mutationFn: (status: string) => 
      apiRequest('PATCH', `/api/clients/${clientId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: t('client.toast.status.updated'),
        description: t('client.toast.status.updated.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('client.toast.status.failed'),
        variant: "destructive",
      });
    },
  });

  const updateCustomStatusMutation = useMutation({
    mutationFn: (statusId: string | null) => 
      apiRequest('PATCH', `/api/clients/${clientId}`, { statusId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: t('client.toast.custom.status.updated'),
        description: t('client.toast.custom.status.updated.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('client.toast.custom.status.failed'),
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
        title: t('client.toast.comment.added'),
        description: t('client.toast.comment.added.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('client.toast.comment.failed'),
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
        title: t('client.toast.comment.updated'),
        description: t('client.toast.comment.updated.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('client.toast.comment.update.failed'),
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/comments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'comments'] });
      toast({
        title: t('client.toast.comment.deleted'),
        description: t('client.toast.comment.deleted.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('client.toast.comment.delete.failed'),
        variant: "destructive",
      });
    },
  });

  const createCalendarEventMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      eventType: string;
      clientId: string;
      startTime: string;
      endTime: string;
      location?: string;
      status: string;
    }) => apiRequest('POST', '/api/calendar/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setCalendarEventDialogOpen(false);
      // Reset form
      setEventTitle('');
      setEventDescription('');
      setEventType('call');
      setEventStartTime('');
      setEventEndTime('');
      setEventLocation('');
      toast({
        title: t('toast.success.created'),
        description: t('calendar.event.created.successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('calendar.event.failed.to.create'),
        variant: "destructive",
      });
    },
  });

  const saveKycResponsesMutation = useMutation({
    mutationFn: (responses: any[]) => 
      apiRequest('POST', `/api/clients/${clientId}/kyc-responses`, { responses }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'kyc-responses'] });
      toast({
        title: t('toast.success.saved'),
        description: t('client.kyc.saved.successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('client.kyc.failed.to.save'),
        variant: "destructive",
      });
    },
  });

  const updateKycStatusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: 'pending' | 'verified' | 'rejected', notes?: string }) =>
      apiRequest('PATCH', `/api/clients/${clientId}/kyc-status`, { kycStatus: status, notes }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'kyc-progress'] });
      setKycVerificationNotes('');
      toast({
        title: 'KYC Status Updated',
        description: `KYC has been ${variables.status}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update KYC status',
        variant: "destructive",
      });
    },
  });

  // Populate KYC form with existing responses
  useEffect(() => {
    if (kycResponses && kycResponses.length > 0) {
      const responsesMap: Record<string, string> = {};
      kycResponses.forEach((response: any) => {
        responsesMap[response.questionId] = response.response;
      });
      setKycFormResponses(responsesMap);
    }
  }, [kycResponses]);

  const createSubaccountMutation = useMutation({
    mutationFn: (data: { accountId: string; name: string; currency: string }) =>
      apiRequest('POST', '/api/subaccounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subaccounts', client?.account?.id] });
      setCreateSubaccountOpen(false);
      setNewSubaccountName('');
      setNewSubaccountCurrency('USD');
      toast({
        title: t('client.toast.subaccount.created'),
        description: t('client.toast.subaccount.created.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('client.toast.subaccount.failed'),
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
          title: t('client.toast.transfer.rejected'),
          description: t('client.toast.transfer.rejected.description'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('client.toast.transfer.completed'),
          description: t('client.toast.transfer.completed.description', { amount: result.amount }),
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.transfer.failed'),
        description: error.message || t('client.toast.transfer.failed.description'),
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
        title: t('client.toast.assignment.updated'),
        description: t('client.toast.assignment.updated.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.assignment.failed'),
        description: error.message || t('client.toast.assignment.failed.description'),
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
        title: t('client.toast.client.transferred'),
        description: t('client.toast.client.transferred.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.client.transfer.failed'),
        description: error.message || t('client.toast.client.transfer.failed.description'),
        variant: "destructive",
      });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/clients/${clientId}/impersonate`),
    onSuccess: (data: any) => {
      window.open(data.ssoUrl, '_blank');
      toast({
        title: t('client.toast.sso.generated'),
        description: t('client.toast.sso.generated.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.sso.failed'),
        description: error.message || t('client.toast.sso.failed.description'),
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
        title: t('client.toast.balance.adjusted'),
        description: t('client.toast.balance.adjusted.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.balance.adjustment.failed'),
        description: error.message || t('client.toast.balance.adjustment.failed.description'),
        variant: "destructive",
      });
    },
  });

  const modifyPositionMutation = useMutation({
    mutationFn: (data: { openPrice?: string; closePrice?: string; quantity?: string; side?: 'buy' | 'sell'; unrealizedPnl?: string; realizedPnl?: string; openedAt?: string; closedAt?: string }) =>
      apiRequest('PATCH', `/api/positions/${selectedPosition?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      setModifyPositionDialogOpen(false);
      setSelectedPosition(null);
      toast({
        title: t('client.toast.position.modified'),
        description: t('client.toast.position.modified.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.position.modification.failed'),
        description: error.message || t('client.toast.position.modification.failed.description'),
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
        title: t('client.toast.position.closed'),
        description: t('client.toast.position.closed.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.position.close.failed'),
        description: error.message || t('client.toast.position.close.failed.description'),
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
        title: t('client.toast.position.deleted'),
        description: t('client.toast.position.deleted.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.position.delete.failed'),
        description: error.message || t('client.toast.position.delete.failed.description'),
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
        title: t('client.toast.leverage.updated'),
        description: t('client.toast.leverage.updated.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('client.toast.leverage.update.failed'),
        description: error.message || t('client.toast.leverage.update.failed.description'),
        variant: "destructive",
      });
    },
  });

  const handleClientTransfer = () => {
    if (!clientTransferReason.trim()) {
      toast({
        title: t('client.toast.transfer.reason.required'),
        description: t('client.toast.transfer.reason.required.description'),
        variant: "destructive",
      });
      return;
    }

    if (!transferNewAgentId && !transferNewTeamId) {
      toast({
        title: t('client.toast.transfer.assignment.required'),
        description: t('client.toast.transfer.assignment.required.description'),
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
        <p className="text-muted-foreground">{t('client.detail.client.not.found')}</p>
        <Button asChild variant="outline">
          <Link href="/clients">{t('client.detail.back.to.clients')}</Link>
        </Button>
      </div>
    );
  }

  // KYC Permission Helpers
  const canFillKyc = () => {
    // Everyone can fill KYC forms
    return true;
  };

  const canEditKyc = () => {
    // Everyone can edit KYC responses
    return true;
  };

  const canViewKyc = () => {
    // Everyone can view KYC data
    return true;
  };

  const canManageKyc = () => {
    // Only managers can approve/reject KYC
    return hasAnyPermission(['kyc.manage', '*']);
  };

  const handleKycFormSubmit = () => {
    // Check permissions before submitting
    if (!canFillKyc() && !canEditKyc()) {
      toast({
        title: t('common.error'),
        description: t('client.kyc.permission.denied'),
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    const activeQuestions = kycQuestions.filter((q: any) => q.isActive);
    const requiredQuestions = activeQuestions.filter((q: any) => q.isRequired);
    const missingRequired = requiredQuestions.filter(
      (q: any) => !kycFormResponses[q.id] || kycFormResponses[q.id].trim() === ''
    );

    if (missingRequired.length > 0) {
      toast({
        title: t('common.error'),
        description: t('client.kyc.required.fields.missing', { 
          count: missingRequired.length 
        }),
        variant: "destructive",
      });
      return;
    }

    // Build responses array only for questions that have answers
    const responses = Object.entries(kycFormResponses)
      .filter(([, response]) => response && response.trim() !== '')
      .map(([questionId, response]) => ({
        questionId,
        response,
        fileUrls: [],
      }));

    saveKycResponsesMutation.mutate(responses);
  };

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
              {client.statusId && customStatuses.length > 0 && (
                <Badge 
                  style={{ 
                    backgroundColor: customStatuses.find((s: CustomStatus) => s.id === client.statusId)?.color,
                    color: '#fff'
                  }}
                  data-testid="badge-status"
                >
                  {customStatuses.find((s: CustomStatus) => s.id === client.statusId)?.name}
                </Badge>
              )}
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
            {t('client.detail.call')}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = `mailto:${client.email}`}
            data-testid="button-email-client" 
            className="hover-elevate active-elevate-2"
          >
            <Mail className="h-4 w-4 mr-2" />
            {t('client.detail.email')}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setQuickCommentDialogOpen(true)}
            data-testid="button-add-comment" 
            className="hover-elevate active-elevate-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('client.detail.add.comment')}
          </Button>
          {/* Only Admin, CRM Manager, and Team Leaders can schedule events */}
          {(user?.role?.name?.toLowerCase() === 'administrator' || 
            user?.role?.name?.toLowerCase() === 'crm manager' ||
            user?.role?.name?.toLowerCase() === 'sales team leader' ||
            user?.role?.name?.toLowerCase() === 'retention team leader') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCalendarEventDialogOpen(true)}
              data-testid="button-schedule-event" 
              className="hover-elevate active-elevate-2"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {t('client.detail.schedule.event')}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => impersonateMutation.mutate()}
            disabled={impersonateMutation.isPending}
            data-testid="button-impersonate" 
            className="hover-elevate active-elevate-2"
          >
            {impersonateMutation.isPending ? t('client.detail.generating') : t('client.detail.login.as.client')}
          </Button>
          {/* Only Admin, CRM Manager, and Team Leaders can transfer clients */}
          {(user?.role?.name?.toLowerCase() === 'administrator' || 
            user?.role?.name?.toLowerCase() === 'crm manager' ||
            user?.role?.name?.toLowerCase() === 'sales team leader' ||
            user?.role?.name?.toLowerCase() === 'retention team leader') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setClientTransferDialogOpen(true)}
              data-testid="button-transfer-client" 
              className="hover-elevate active-elevate-2"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {t('client.detail.transfer.client')}
            </Button>
          )}
          <Button size="sm" asChild data-testid="button-edit-client" className="hover-elevate active-elevate-2">
            <Link href={`/clients/${client.id}/edit`}>{t('client.detail.edit.client')}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('client.detail.contact.info')}</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('client.detail.account.summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('client.detail.custom.status')}</span>
              <Select
                value={client.statusId || ''}
                onValueChange={(value) => updateCustomStatusMutation.mutate(value || null)}
                disabled={updateCustomStatusMutation.isPending}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-status">
                  <SelectValue placeholder={t('common.select.status')} />
                </SelectTrigger>
                <SelectContent>
                  {customStatuses.map((status: CustomStatus) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('client.detail.client.status')}</span>
              <Select
                value={client.status || 'new'}
                onValueChange={(value) => updateClientStatusMutation.mutate(value)}
                disabled={updateClientStatusMutation.isPending}
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
            <div className="py-2 border-t">
              <KycProgress clientId={client.id} showDetails={true} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('common.status')}</span>
              <Badge variant={client.isActive ? 'default' : 'destructive'}>
                {client.isActive ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
            {/* Only Admin, CRM Manager, and Team Leaders can assign clients */}
            {(user?.role?.name?.toLowerCase() === 'administrator' || 
              user?.role?.name?.toLowerCase() === 'crm manager' ||
              user?.role?.name?.toLowerCase() === 'sales team leader' ||
              user?.role?.name?.toLowerCase() === 'retention team leader') && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('client.detail.assigned.agent')}</span>
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
                      <SelectItem value="none">{t('client.detail.unassigned')}</SelectItem>
                      {agents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('client.detail.assigned.team')}</span>
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
                      <SelectItem value="none">{t('common.no.team')}</SelectItem>
                      {teams.map((team: any) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next Follow-up</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={client.nextFollowUpDate ? new Date(client.nextFollowUpDate).toISOString().slice(0, 10) : ''}
                    onChange={async (e) => {
                      const value = e.target.value;
                      if (value) {
                        try {
                          if (!user?.id) {
                            throw new Error('User not authenticated');
                          }
                          
                          // Parse as local date and convert to ISO string for storage
                          const localDate = new Date(value + 'T00:00:00');
                          
                          // Update client's next follow-up date
                          await apiRequest('PATCH', `/api/clients/${clientId}`, {
                            nextFollowUpDate: localDate.toISOString()
                          });
                          
                          // Create calendar event automatically
                          const clientName = `${client.firstName} ${client.lastName}`.trim();
                          const startTime = new Date(value + 'T09:00:00').toISOString();
                          const endTime = new Date(value + 'T09:30:00').toISOString();
                          
                          await apiRequest('POST', '/api/calendar/events', {
                            title: `Follow-up: ${clientName}`,
                            eventType: 'follow_up',
                            userId: user.id,
                            clientId: client.id,
                            startTime,
                            endTime,
                            status: 'scheduled',
                            description: `Follow-up call with ${clientName}`,
                          });
                          
                          queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
                          queryClient.invalidateQueries({ 
                            predicate: (query) => {
                              const key = query.queryKey[0];
                              return typeof key === 'string' && key.startsWith('/api/calendar/events');
                            }
                          });
                          
                          toast({
                            title: t('client.detail.followup.date.set'),
                            description: t('client.detail.followup.date.set.with.calendar'),
                          });
                        } catch (error) {
                          toast({
                            title: t('common.error'),
                            description: t('client.detail.followup.date.update.failed'),
                            variant: "destructive",
                          });
                        }
                      } else {
                        apiRequest('PATCH', `/api/clients/${clientId}`, {
                          nextFollowUpDate: null
                        }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
                          toast({
                            title: t('client.detail.followup.date.cleared'),
                            description: t('client.detail.followup.date.cleared.description'),
                          });
                        }).catch(() => {
                          toast({
                            title: t('common.error'),
                            description: t('client.detail.followup.date.clear.failed'),
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
                            title: t('client.detail.followup.date.cleared'),
                            description: t('client.detail.followup.date.removed.description'),
                          });
                        }).catch(() => {
                          toast({
                            title: t('common.error'),
                            description: t('client.detail.followup.date.clear.failed'),
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
                  {t('client.detail.adjust.balance.button')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('client.detail.adjust.balance.dialog.title')}</DialogTitle>
                  <DialogDescription>
                    {t('client.detail.adjust.balance.dialog.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="adjust-amount">{t('client.detail.amount')}</Label>
                    <Input
                      id="adjust-amount"
                      type="number"
                      step="0.01"
                      placeholder={t('client.detail.adjust.amount.placeholder')}
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      data-testid="input-adjust-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fund-type">{t('client.detail.fund.type')}</Label>
                    <Select value={adjustFundType} onValueChange={(value: 'real' | 'demo' | 'bonus') => setAdjustFundType(value)}>
                      <SelectTrigger id="fund-type" data-testid="select-fund-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real">{t('client.detail.real')}</SelectItem>
                        <SelectItem value="demo">{t('client.detail.demo')}</SelectItem>
                        <SelectItem value="bonus">{t('client.detail.bonus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adjust-notes">{t('client.detail.adjust.notes.label')}</Label>
                    <Textarea
                      id="adjust-notes"
                      placeholder={t('client.detail.adjust.notes.placeholder')}
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
                          title: t('client.toast.invalid.amount'),
                          description: t('client.toast.invalid.amount.description'),
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
                    {adjustBalanceMutation.isPending ? t('common.saving') : t('common.save')}
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
                  <DialogTitle>{t('client.detail.modify.position.dialog.title')}</DialogTitle>
                  <DialogDescription>
                    {t('client.detail.modify.position.dialog.description')}: {selectedPosition?.symbol} ({selectedPosition?.id})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="modify-side">{t('client.detail.type')}</Label>
                    <Select value={modifySide} onValueChange={(value: 'buy' | 'sell') => setModifySide(value)}>
                      <SelectTrigger id="modify-side" data-testid="select-modify-side">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">{t('client.detail.buy')}</SelectItem>
                        <SelectItem value="sell">{t('client.detail.sell')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modify-quantity">{t('client.detail.volume')}</Label>
                    <Input
                      id="modify-quantity"
                      type="number"
                      step="0.01"
                      placeholder={t('client.detail.modify.position.placeholder.quantity')}
                      value={modifyQuantity}
                      onChange={(e) => setModifyQuantity(e.target.value)}
                      data-testid="input-modify-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modify-open-price">{t('client.detail.open.price')}</Label>
                    <Input
                      id="modify-open-price"
                      type="number"
                      step="0.00001"
                      placeholder={t('client.detail.modify.position.placeholder.price')}
                      value={modifyOpenPrice}
                      onChange={(e) => setModifyOpenPrice(e.target.value)}
                      data-testid="input-modify-open-price"
                    />
                  </div>
                  {selectedPosition?.status === 'closed' && (
                    <div className="space-y-2">
                      <Label htmlFor="modify-close-price">{t('client.detail.close.price')}</Label>
                      <Input
                        id="modify-close-price"
                        type="number"
                        step="0.00001"
                        placeholder={t('client.detail.modify.position.placeholder.price')}
                        value={modifyClosePrice}
                        onChange={(e) => setModifyClosePrice(e.target.value)}
                        data-testid="input-modify-close-price"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="modify-pnl">{t('client.detail.modify.position.pnl.label')}</Label>
                    <Input
                      id="modify-pnl"
                      type="number"
                      step="0.0001"
                      placeholder={t('client.detail.modify.position.pnl.placeholder')}
                      value={modifyPnl}
                      onChange={(e) => setModifyPnl(e.target.value)}
                      data-testid="input-modify-pnl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modify-opened-at">{t('client.detail.modify.position.opened.at')}</Label>
                    <Input
                      id="modify-opened-at"
                      type="datetime-local"
                      value={modifyOpenedAt}
                      onChange={(e) => setModifyOpenedAt(e.target.value)}
                      data-testid="input-modify-opened-at"
                    />
                  </div>
                  {selectedPosition?.status === 'closed' && (
                    <div className="space-y-2">
                      <Label htmlFor="modify-closed-at">{t('client.detail.modify.position.closed.at')}</Label>
                      <Input
                        id="modify-closed-at"
                        type="datetime-local"
                        value={modifyClosedAt}
                        onChange={(e) => setModifyClosedAt(e.target.value)}
                        data-testid="input-modify-closed-at"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      const updates: any = {
                        side: modifySide,
                        quantity: modifyQuantity,
                        openPrice: modifyOpenPrice,
                      };
                      // Send correct P/L field based on position status
                      if (modifyPnl) {
                        if (selectedPosition?.status === 'closed') {
                          updates.realizedPnl = modifyPnl;
                        } else {
                          updates.unrealizedPnl = modifyPnl;
                        }
                      }
                      if (modifyClosePrice) updates.closePrice = modifyClosePrice;
                      if (modifyOpenedAt) updates.openedAt = new Date(modifyOpenedAt).toISOString();
                      if (modifyClosedAt) updates.closedAt = new Date(modifyClosedAt).toISOString();
                      
                      modifyPositionMutation.mutate(updates);
                    }}
                    disabled={modifyPositionMutation.isPending}
                    data-testid="button-save-position"
                  >
                    {modifyPositionMutation.isPending ? t('client.detail.modify.position.saving') : t('client.detail.modify.position.save.changes')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('client.detail.balance')}</span>
              <span className="text-sm font-mono font-medium" data-testid="text-account-balance">
                ${(client.account?.balance || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 items-center" data-testid="fund-breakdown">
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                {t('client.detail.real.label')} ${(client.account?.realBalance || 0).toLocaleString()}
              </Badge>
              <span className="text-muted-foreground">|</span>
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                {t('client.detail.demo.label')} ${(client.account?.demoBalance || 0).toLocaleString()}
              </Badge>
              <span className="text-muted-foreground">|</span>
              <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700">
                {t('client.detail.bonus.label')} ${(client.account?.bonusBalance || 0).toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('client.detail.equity')}</span>
              <span className="text-sm font-mono font-medium">
                ${(client.account?.equity || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('client.detail.margin')}</span>
              <span className="text-sm font-mono">
                ${(client.account?.margin || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('client.detail.leverage')}</span>
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
          <TabsTrigger value="positions" data-testid="tab-positions">{t('client.detail.tab.positions')}</TabsTrigger>
          <TabsTrigger value="trade-history" data-testid="tab-trade-history">{t('client.detail.tab.trade.history')}</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">{t('transactions.title')}</TabsTrigger>
          <TabsTrigger value="subaccounts" data-testid="tab-subaccounts">{t('client.detail.tab.subaccounts')}</TabsTrigger>
          <TabsTrigger value="transfers" data-testid="tab-transfers">{t('client.detail.tab.transfers')}</TabsTrigger>
          <TabsTrigger value="kyc" data-testid="tab-kyc">{t('client.detail.tab.kyc')}</TabsTrigger>
          <TabsTrigger value="comments" data-testid="tab-comments">{t('client.detail.tab.comments')}</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">{t('client.detail.tab.documents')}</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('client.detail.tab.positions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('client.detail.symbol')}</TableHead>
                    <TableHead>{t('client.detail.type')}</TableHead>
                    <TableHead>{t('client.detail.volume')}</TableHead>
                    <TableHead>{t('client.detail.open.price')}</TableHead>
                    <TableHead>{t('client.detail.current.price')}</TableHead>
                    <TableHead>{t('client.detail.pnl')}</TableHead>
                    <TableHead>{t('client.detail.opened')}</TableHead>
                    <TableHead>{t('client.detail.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.positions?.length > 0 ? (
                    client.positions.map((position: any) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={position.side === 'buy' ? 'default' : 'destructive'}>
                            {t(`client.detail.side.${position.side}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{position.quantity}</TableCell>
                        <TableCell className="font-mono">{position.openPrice}</TableCell>
                        <TableCell className="font-mono">{position.currentPrice || '-'}</TableCell>
                        <TableCell>
                          <span className={`font-mono font-medium ${
                            (position.unrealizedPnl || 0) >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            ${parseFloat(position.unrealizedPnl || 0).toFixed(8).replace(/\.?0+$/, '')}
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
                                if (confirm(t('client.detail.delete.position.confirm', { symbol: position.symbol }))) {
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
                        <p className="text-sm text-muted-foreground">{t('client.detail.no.open.positions')}</p>
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
              <CardTitle className="text-lg">{t('client.detail.tab.subaccounts')}</CardTitle>
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
                      {t('client.detail.internal.transfer.button')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('client.detail.transfer.dialog.title')}</DialogTitle>
                      <DialogDescription>
                        {t('client.detail.transfer.dialog.description')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="from-subaccount">{t('client.detail.transfer.from.label')}</Label>
                        <Select value={transferFromSubaccountId} onValueChange={setTransferFromSubaccountId}>
                          <SelectTrigger id="from-subaccount" data-testid="select-from-subaccount">
                            <SelectValue placeholder={t('client.detail.transfer.from.placeholder')} />
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
                        <Label htmlFor="to-subaccount">{t('client.detail.transfer.to.label')}</Label>
                        <Select value={transferToSubaccountId} onValueChange={setTransferToSubaccountId}>
                          <SelectTrigger id="to-subaccount" data-testid="select-to-subaccount">
                            <SelectValue placeholder={t('client.detail.transfer.to.placeholder')} />
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
                        <Label htmlFor="transfer-amount">{t('client.detail.transfer.amount.label')}</Label>
                        <Input
                          id="transfer-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t('client.detail.transfer.amount.placeholder')}
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          data-testid="input-transfer-amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transfer-notes">{t('client.detail.transfer.notes.label')}</Label>
                        <Textarea
                          id="transfer-notes"
                          placeholder={t('client.detail.transfer.notes.placeholder')}
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
                        {t('client.detail.cancel')}
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
                              title: t('client.toast.invalid.amount'),
                              description: t('client.toast.invalid.amount.description'),
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!transferFromSubaccountId || !transferToSubaccountId || !transferAmount || Number(transferAmount) <= 0 || transferMutation.isPending}
                        data-testid="button-confirm-transfer"
                      >
                        {transferMutation.isPending ? t('client.detail.transfer.processing') : t('client.detail.transfer.button')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={createSubaccountOpen} onOpenChange={setCreateSubaccountOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-create-subaccount">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('client.detail.create.subaccount.button')}
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('client.detail.subaccount.dialog.title')}</DialogTitle>
                    <DialogDescription>
                      {t('client.detail.subaccount.dialog.description')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="subaccount-name">{t('client.detail.subaccount.name.label')}</Label>
                      <Input
                        id="subaccount-name"
                        placeholder={t('client.detail.subaccount.name.placeholder')}
                        value={newSubaccountName}
                        onChange={(e) => setNewSubaccountName(e.target.value)}
                        data-testid="input-subaccount-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subaccount-currency">{t('client.detail.subaccount.currency.label')}</Label>
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
                      {t('client.detail.cancel')}
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
                      {t('client.detail.create.subaccount.button')}
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
                    <TableHead>{t('client.detail.name')}</TableHead>
                    <TableHead>{t('client.detail.currency')}</TableHead>
                    <TableHead>{t('client.detail.balance')}</TableHead>
                    <TableHead>{t('client.detail.equity')}</TableHead>
                    <TableHead>{t('client.detail.margin')}</TableHead>
                    <TableHead>{t('client.detail.status')}</TableHead>
                    <TableHead>{t('client.detail.default')}</TableHead>
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
                            {subaccount.isActive ? t('client.detail.active') : t('client.detail.inactive')}
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
                        <p className="text-sm text-muted-foreground">{t('client.detail.no.subaccounts.yet')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('client.detail.create.subaccount.helper')}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trade-history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('client.detail.tab.trade.history.full')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('client.detail.symbol')}</TableHead>
                    <TableHead>{t('client.detail.side')}</TableHead>
                    <TableHead>{t('client.detail.volume')}</TableHead>
                    <TableHead>{t('client.detail.open.price')}</TableHead>
                    <TableHead>{t('client.detail.close.price')}</TableHead>
                    <TableHead>{t('client.detail.pnl')}</TableHead>
                    <TableHead>{t('client.detail.opened')}</TableHead>
                    <TableHead>{t('client.detail.closed')}</TableHead>
                    <TableHead>{t('client.detail.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedPositions.length > 0 ? (
                    closedPositions.map((position: any) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={position.side === 'buy' ? 'default' : 'destructive'}>
                            {t(`client.detail.side.${position.side}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{position.quantity}</TableCell>
                        <TableCell className="font-mono">{position.openPrice}</TableCell>
                        <TableCell className="font-mono">{position.closePrice || '-'}</TableCell>
                        <TableCell>
                          <span className={`font-mono font-medium ${
                            (position.realizedPnl || 0) >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            ${parseFloat(position.realizedPnl || 0).toFixed(8).replace(/\.?0+$/, '')}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {position.openedAt ? format(new Date(position.openedAt), 'MMM d, HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {position.closedAt ? format(new Date(position.closedAt), 'MMM d, HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedPosition(position);
                                setModifyOpenPrice(position.openPrice);
                                setModifyClosePrice(position.closePrice || position.currentPrice || '');
                                setModifyQuantity(position.quantity);
                                setModifySide(position.side);
                                setModifyPnl(position.realizedPnl || '');
                                if (position.openedAt) {
                                  const date = new Date(position.openedAt);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const hours = String(date.getHours()).padStart(2, '0');
                                  const minutes = String(date.getMinutes()).padStart(2, '0');
                                  setModifyOpenedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
                                }
                                if (position.closedAt) {
                                  const date = new Date(position.closedAt);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const hours = String(date.getHours()).padStart(2, '0');
                                  const minutes = String(date.getMinutes()).padStart(2, '0');
                                  setModifyClosedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
                                } else {
                                  setModifyClosedAt('');
                                }
                                setModifyPositionDialogOpen(true);
                              }}
                              data-testid={`button-modify-closed-position-${position.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                if (confirm(t('client.detail.delete.trade.confirm'))) {
                                  try {
                                    await apiRequest('DELETE', `/api/positions/${position.id}`);
                                    toast({
                                      title: t('common.success'),
                                      description: t('client.detail.delete.trade.success'),
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'closed-positions'] });
                                    queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
                                  } catch (error) {
                                    toast({
                                      title: t('common.error'),
                                      description: t('client.detail.delete.trade.failed'),
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                              data-testid={`button-delete-closed-position-${position.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <p className="text-sm text-muted-foreground">{t('client.detail.no.closed.trades')}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <TransactionsSection clientId={Number(clientId)} />
        </TabsContent>

        <TabsContent value="transfers" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">{t('client.detail.internal.transfer.history')}</CardTitle>
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
                {t('client.detail.export.csv')}
              </Button>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Label htmlFor="filter-subaccount" className="text-sm">{t('client.detail.filter.by.subaccount')}</Label>
                  <Select value={filterSubaccount} onValueChange={setFilterSubaccount}>
                    <SelectTrigger id="filter-subaccount" data-testid="select-filter-subaccount">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('client.detail.all.subaccounts')}</SelectItem>
                      {subaccounts.map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name} ({sub.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="filter-date-from" className="text-sm">{t('client.detail.filter.date.from')}</Label>
                  <Input
                    id="filter-date-from"
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    data-testid="input-filter-date-from"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="filter-date-to" className="text-sm">{t('client.detail.filter.date.to')}</Label>
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
                    <TableHead>{t('client.detail.date')}</TableHead>
                    <TableHead>{t('client.detail.from')}</TableHead>
                    <TableHead>{t('client.detail.to')}</TableHead>
                    <TableHead>{t('client.detail.amount')}</TableHead>
                    <TableHead>{t('client.detail.status')}</TableHead>
                    <TableHead>{t('client.detail.notes')}</TableHead>
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
                            <div className="font-medium">{fromSub?.name || t('client.detail.unknown')}</div>
                            <div className="text-xs text-muted-foreground">{fromSub?.currency}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium">{toSub?.name || t('client.detail.unknown')}</div>
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
                              {t(`client.detail.${transfer.status}`)}
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
                        <p className="text-sm text-muted-foreground">{t('client.detail.no.internal.transfers')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('client.detail.transfers.helper')}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('client.detail.kyc.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('client.detail.kyc.subtitle')}</p>
              {!canViewKyc() && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{t('client.kyc.permission.view.denied')}</p>
                </div>
              )}
              {canViewKyc() && !canFillKyc() && !canEditKyc() && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">{t('client.kyc.view.only.mode')}</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!canViewKyc() ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('client.kyc.access.denied')}</p>
                </div>
              ) : kycQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('client.detail.kyc.no.questions')}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('client.detail.kyc.admin.setup.required')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {kycQuestions
                    .filter((q: any) => q.isActive)
                    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                    .map((question: any) => (
                      <div key={question.id} className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          {question.question}
                          {question.isRequired && <span className="text-destructive">*</span>}
                        </Label>
                        
                        {question.questionType === 'text' && (
                          <Input
                            value={kycFormResponses[question.id] || ''}
                            onChange={(e) => setKycFormResponses({ ...kycFormResponses, [question.id]: e.target.value })}
                            data-testid={`input-kyc-${question.id}`}
                            placeholder={t('client.detail.kyc.answer.placeholder')}
                            disabled={!canFillKyc() && !canEditKyc()}
                          />
                        )}
                        
                        {question.questionType === 'textarea' && (
                          <Textarea
                            value={kycFormResponses[question.id] || ''}
                            onChange={(e) => setKycFormResponses({ ...kycFormResponses, [question.id]: e.target.value })}
                            data-testid={`textarea-kyc-${question.id}`}
                            placeholder={t('client.detail.kyc.answer.placeholder')}
                            rows={4}
                            disabled={!canFillKyc() && !canEditKyc()}
                          />
                        )}
                        
                        {question.questionType === 'select' && (
                          <Select
                            value={kycFormResponses[question.id] || ''}
                            onValueChange={(value) => setKycFormResponses({ ...kycFormResponses, [question.id]: value })}
                            disabled={!canFillKyc() && !canEditKyc()}
                          >
                            <SelectTrigger data-testid={`select-kyc-${question.id}`}>
                              <SelectValue placeholder={t('client.detail.kyc.select.option')} />
                            </SelectTrigger>
                            <SelectContent>
                              {question.options && Array.isArray(question.options) && question.options.map((option: string) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {question.questionType === 'radio' && question.options && Array.isArray(question.options) && (
                          <div className="space-y-2">
                            {question.options.map((option: string) => (
                              <label key={option} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={option}
                                  checked={kycFormResponses[question.id] === option}
                                  onChange={(e) => setKycFormResponses({ ...kycFormResponses, [question.id]: e.target.value })}
                                  data-testid={`radio-kyc-${question.id}-${option}`}
                                  disabled={!canFillKyc() && !canEditKyc()}
                                />
                                <span className="text-sm">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {question.questionType === 'checkbox' && question.options && Array.isArray(question.options) && (
                          <div className="space-y-2">
                            {question.options.map((option: string) => (
                              <label key={option} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  value={option}
                                  checked={(kycFormResponses[question.id] || '').split(',').includes(option)}
                                  onChange={(e) => {
                                    const currentValues = (kycFormResponses[question.id] || '').split(',').filter(Boolean);
                                    const newValues = e.target.checked
                                      ? [...currentValues, option]
                                      : currentValues.filter(v => v !== option);
                                    setKycFormResponses({ ...kycFormResponses, [question.id]: newValues.join(',') });
                                  }}
                                  data-testid={`checkbox-kyc-${question.id}-${option}`}
                                  disabled={!canFillKyc() && !canEditKyc()}
                                />
                                <span className="text-sm">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {question.questionType === 'date' && (
                          <Input
                            type="date"
                            value={kycFormResponses[question.id] || ''}
                            onChange={(e) => setKycFormResponses({ ...kycFormResponses, [question.id]: e.target.value })}
                            data-testid={`date-kyc-${question.id}`}
                            disabled={!canFillKyc() && !canEditKyc()}
                          />
                        )}
                      </div>
                    ))}
                  
                  {(canFillKyc() || canEditKyc()) && (
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleKycFormSubmit}
                        disabled={saveKycResponsesMutation.isPending}
                        data-testid="button-save-kyc"
                        className="hover-elevate active-elevate-2"
                      >
                        {saveKycResponsesMutation.isPending ? t('common.saving') : t('client.detail.kyc.save')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {canManageKyc() && client && canViewKyc() && kycQuestions.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">KYC Verification</CardTitle>
                <p className="text-sm text-muted-foreground">Review and verify client's KYC submission</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Current Status:</span>
                    <Badge 
                      variant={client.kycStatus === 'verified' ? 'default' : client.kycStatus === 'rejected' ? 'destructive' : 'secondary'}
                      data-testid="badge-kyc-status"
                    >
                      {client.kycStatus}
                    </Badge>
                  </div>
                  <KycProgress clientId={client.id} showDetails={false} />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Verification Notes (Optional)</Label>
                  <Textarea
                    value={kycVerificationNotes}
                    onChange={(e) => setKycVerificationNotes(e.target.value)}
                    placeholder="Add notes about the verification decision (e.g., missing documents, clarifications needed, approval reason)"
                    rows={3}
                    data-testid="textarea-kyc-verification-notes"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  {client.kycStatus !== 'pending' && (
                    <Button
                      variant="outline"
                      onClick={() => updateKycStatusMutation.mutate({ 
                        status: 'pending', 
                        notes: kycVerificationNotes 
                      })}
                      disabled={updateKycStatusMutation.isPending}
                      data-testid="button-kyc-reset"
                    >
                      Reset to Pending
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => updateKycStatusMutation.mutate({ 
                      status: 'rejected', 
                      notes: kycVerificationNotes 
                    })}
                    disabled={updateKycStatusMutation.isPending || client.kycStatus === 'rejected'}
                    data-testid="button-kyc-reject"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject KYC
                  </Button>
                  <Button
                    onClick={() => updateKycStatusMutation.mutate({ 
                      status: 'verified', 
                      notes: kycVerificationNotes 
                    })}
                    disabled={updateKycStatusMutation.isPending || client.kycStatus === 'verified'}
                    data-testid="button-kyc-approve"
                    className="hover-elevate active-elevate-2"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve KYC
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('client.detail.client.comments')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Textarea
                  placeholder={t('client.detail.comment.placeholder')}
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
                    {t('client.detail.quick.comment.button')}
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
                              {comment.user?.name || t('client.detail.unknown.user')}
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
                                {t('client.detail.save')}
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
                                {t('client.detail.cancel')}
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
                            <span className="italic">{t('client.detail.edited')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('client.detail.no.comments')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('client.detail.kyc.documents')}</CardTitle>
            </CardHeader>
            <CardContent>
              {clientId && <DocumentManagement clientId={clientId} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Client Dialog */}
      <Dialog open={clientTransferDialogOpen} onOpenChange={setClientTransferDialogOpen}>
        <DialogContent data-testid="dialog-transfer-client">
          <DialogHeader>
            <DialogTitle>{t('client.detail.transfer.client.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('client.detail.transfer.client.dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-agent">{t('client.detail.transfer.client.new.agent')}</Label>
              <Select
                value={transferNewAgentId}
                onValueChange={setTransferNewAgentId}
              >
                <SelectTrigger id="transfer-agent" data-testid="select-transfer-agent">
                  <SelectValue placeholder={t('client.detail.transfer.client.new.agent.placeholder')} />
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
                  <SelectValue placeholder={t('client.detail.transfer.client.new.team.placeholder')} />
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
              <Label htmlFor="transfer-reason">{t('client.detail.transfer.client.reason')}</Label>
              <Textarea
                id="transfer-reason"
                placeholder={t('client.detail.transfer.client.reason.placeholder')}
                value={clientTransferReason}
                onChange={(e) => setClientTransferReason(e.target.value)}
                rows={4}
                data-testid="textarea-transfer-reason"
              />
              <p className="text-xs text-muted-foreground">
                {t('client.detail.transfer.client.reason.note')}
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleClientTransfer}
              disabled={clientTransferMutation.isPending || !clientTransferReason.trim() || (!transferNewAgentId && !transferNewTeamId)}
              data-testid="button-confirm-transfer"
              className="hover-elevate active-elevate-2"
            >
              {clientTransferMutation.isPending ? t('client.detail.transfer.client.transferring') : t('client.detail.transfer.client.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Comment Dialog */}
      <Dialog open={quickCommentDialogOpen} onOpenChange={setQuickCommentDialogOpen}>
        <DialogContent data-testid="dialog-quick-comment">
          <DialogHeader>
            <DialogTitle>{t('client.detail.quick.comment.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('client.detail.quick.comment.dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-comment">{t('client.detail.quick.comment.label')}</Label>
              <Textarea
                id="quick-comment"
                placeholder={t('client.detail.quick.comment.placeholder')}
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!quickComment.trim()) {
                  toast({
                    title: t('common.error'),
                    description: t('client.toast.comment.required'),
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
              {addCommentMutation.isPending ? t('client.detail.quick.comment.adding') : t('client.detail.quick.comment.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Event Dialog */}
      <Dialog open={calendarEventDialogOpen} onOpenChange={setCalendarEventDialogOpen}>
        <DialogContent data-testid="dialog-calendar-event">
          <DialogHeader>
            <DialogTitle>{t('calendar.create.event')}</DialogTitle>
            <DialogDescription>
              {t('calendar.create.event.for.client', { name: `${client.firstName} ${client.lastName}` })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">{t('calendar.event.title')}</Label>
              <Input
                id="event-title"
                placeholder={t('calendar.event.title.placeholder')}
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                data-testid="input-event-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-type">{t('calendar.event.type')}</Label>
              <Select value={eventType} onValueChange={(v: any) => setEventType(v)}>
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">{t('calendar.event.type.meeting')}</SelectItem>
                  <SelectItem value="call">{t('calendar.event.type.call')}</SelectItem>
                  <SelectItem value="follow_up">{t('calendar.follow.up')}</SelectItem>
                  <SelectItem value="demo">{t('calendar.event.type.demo')}</SelectItem>
                  <SelectItem value="kyc_review">{t('calendar.event.type.kyc_review')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">{t('calendar.start.time')}</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  data-testid="input-event-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">{t('calendar.end.time')}</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  data-testid="input-event-end"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">{t('calendar.location')}</Label>
              <Input
                id="event-location"
                placeholder={t('calendar.placeholder.location')}
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                data-testid="input-event-location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">{t('calendar.event.description')}</Label>
              <Textarea
                id="event-description"
                placeholder={t('calendar.event.description.placeholder')}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={3}
                data-testid="textarea-event-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCalendarEventDialogOpen(false);
                // Reset form
                setEventTitle('');
                setEventDescription('');
                setEventType('call');
                setEventStartTime('');
                setEventEndTime('');
                setEventLocation('');
              }}
              data-testid="button-cancel-event"
              className="hover-elevate active-elevate-2"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!eventTitle.trim() || !eventStartTime || !eventEndTime) {
                  toast({
                    title: t('common.error'),
                    description: t('calendar.event.required.fields'),
                    variant: "destructive",
                  });
                  return;
                }
                
                // Validate end time is after start time
                const startDate = new Date(eventStartTime);
                const endDate = new Date(eventEndTime);
                if (endDate <= startDate) {
                  toast({
                    title: t('common.error'),
                    description: t('calendar.event.end.time.must.be.after.start'),
                    variant: "destructive",
                  });
                  return;
                }
                
                // Convert datetime-local to ISO strings for timezone-aware storage
                createCalendarEventMutation.mutate({
                  title: eventTitle,
                  description: eventDescription,
                  eventType,
                  clientId,
                  startTime: startDate.toISOString(),
                  endTime: endDate.toISOString(),
                  location: eventLocation,
                  status: 'scheduled',
                });
              }}
              disabled={createCalendarEventMutation.isPending}
              data-testid="button-submit-event"
              className="hover-elevate active-elevate-2"
            >
              {createCalendarEventMutation.isPending ? t('calendar.creating') : t('calendar.create.event')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Transactions Section Component
function TransactionsSection({ clientId }: { clientId: number }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: transactions, isLoading, isError, error } = useQuery<any[]>({
    queryKey: ['/api/transactions', clientId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('clientId', clientId.toString());
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const res = await fetch(`/api/transactions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return res.json();
    },
    enabled: Boolean(clientId) && !isNaN(clientId) && clientId > 0,
  });

  // Don't render section if clientId is invalid
  if (!clientId || isNaN(clientId) || clientId <= 0) {
    return null;
  }

  // Show error toast and fallback UI if query fails
  if (isError) {
    toast({
      variant: "destructive",
      title: t('common.error'),
      description: t('transactions.empty.description'),
    });
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-lg font-medium text-destructive">{t('common.error')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('transactions.empty.description')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">{t('transactions.title')}</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-transaction-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transactions.filter.all')}</SelectItem>
              <SelectItem value="pending">{t('transactions.filter.pending')}</SelectItem>
              <SelectItem value="approved">{t('transactions.filter.approved')}</SelectItem>
              <SelectItem value="declined">{t('transactions.filter.declined')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transactions.table.type')}</TableHead>
                  <TableHead>{t('transactions.table.amount')}</TableHead>
                  <TableHead>{t('transactions.table.fund.type')}</TableHead>
                  <TableHead>{t('transactions.table.method')}</TableHead>
                  <TableHead>{t('transactions.table.status')}</TableHead>
                  <TableHead>{t('transactions.table.date')}</TableHead>
                  <TableHead>{t('transactions.table.initiated.by')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction: any) => (
                  <TableRow key={transaction.id} data-testid={`row-client-transaction-${transaction.id}`}>
                    <TableCell>
                      <Badge variant={transaction.type === 'deposit' ? 'default' : 'outline'}>
                        {t(`transactions.type.${transaction.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      ${transaction.amount.toLocaleString()}
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
                      >
                        {t(`transactions.fund.type.${transaction.fundType}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.method ? t(`transactions.method.${transaction.method}`) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === 'approved' || transaction.status === 'completed'
                            ? 'default'
                            : transaction.status === 'declined' || transaction.status === 'rejected'
                            ? 'destructive'
                            : transaction.status === 'cancelled'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          transaction.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20'
                            : transaction.status === 'approved' || transaction.status === 'completed'
                            ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20'
                            : transaction.status === 'declined' || transaction.status === 'rejected'
                            ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20'
                            : 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-gray-500/20'
                        }
                      >
                        {t(`transactions.status.${transaction.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.initiator?.name || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {t('transactions.empty.title')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('transactions.empty.description')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
