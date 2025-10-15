import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, DollarSign, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const markFTDSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be greater than 0"
  ),
  fundType: z.enum(['real', 'demo', 'bonus']),
  notes: z.string().optional(),
});

export default function SalesClients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [markFTDOpen, setMarkFTDOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const { toast } = useToast();

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

  // Client-side filtering
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

    if (filterStatus && filterStatus !== 'all') {
      if (client.pipelineStatus !== filterStatus) return false;
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
        title: "FTD marked successfully",
        description: `Client has been moved to retention.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error marking FTD",
        description: error.message || "Failed to mark FTD",
        variant: "destructive",
      });
    },
  });

  const onSubmitFTD = (values: z.infer<typeof markFTDSchema>) => {
    markFTDMutation.mutate(values);
  };

  const getPipelineStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      new_lead: { label: 'New Lead', variant: 'default' },
      contact_attempted: { label: 'Contact Attempted', variant: 'secondary' },
      in_discussion: { label: 'In Discussion', variant: 'default' },
      kyc_pending: { label: 'KYC Pending', variant: 'secondary' },
      active_client: { label: 'Active', variant: 'default' },
      cold_inactive: { label: 'Cold/Inactive', variant: 'outline' },
      lost: { label: 'Lost', variant: 'destructive' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant} data-testid={`badge-pipeline-status-${status}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading sales clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Sales Clients</h1>
          <p className="text-muted-foreground">
            Clients without First Time Deposit (FTD)
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-stats-title">Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold" data-testid="text-total-clients">{clients?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">New Leads</p>
              <p className="text-2xl font-bold" data-testid="text-new-leads">
                {clients?.filter((c: any) => c.pipelineStatus === 'new_lead').length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Discussion</p>
              <p className="text-2xl font-bold" data-testid="text-in-discussion">
                {clients?.filter((c: any) => c.pipelineStatus === 'in_discussion').length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">KYC Pending</p>
              <p className="text-2xl font-bold" data-testid="text-kyc-pending">
                {clients?.filter((c: any) => c.pipelineStatus === 'kyc_pending').length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new_lead">New Lead</SelectItem>
                <SelectItem value="contact_attempted">Contact Attempted</SelectItem>
                <SelectItem value="in_discussion">In Discussion</SelectItem>
                <SelectItem value="kyc_pending">KYC Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Pipeline Status</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients && clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-clients">No sales clients found</p>
                  </TableCell>
                </TableRow>
              ) : (
                clients?.map((client: any) => {
                  const team = teams.find((t: any) => t.id === client.teamId);
                  return (
                    <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                      <TableCell>
                        <Link href={`/clients/${client.id}`}>
                          <a className="font-medium hover:underline" data-testid={`link-client-${client.id}`}>
                            {client.name}
                          </a>
                        </Link>
                      </TableCell>
                      <TableCell data-testid={`text-email-${client.id}`}>{client.email}</TableCell>
                      <TableCell>{getPipelineStatusBadge(client.pipelineStatus)}</TableCell>
                      <TableCell data-testid={`text-team-${client.id}`}>{team?.name || 'Unassigned'}</TableCell>
                      <TableCell data-testid={`text-created-${client.id}`}>
                        {new Date(client.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setMarkFTDOpen(true);
                          }}
                          data-testid={`button-mark-ftd-${client.id}`}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Mark FTD
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mark FTD Dialog */}
      <Dialog open={markFTDOpen} onOpenChange={setMarkFTDOpen}>
        <DialogContent data-testid="dialog-mark-ftd">
          <DialogHeader>
            <DialogTitle>Mark First Time Deposit</DialogTitle>
            <DialogDescription>
              Record the first deposit for {selectedClient?.name}. This will move them to retention.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitFTD)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
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
                    <FormLabel>Fund Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fund-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="real">Real Funds</SelectItem>
                        <SelectItem value="demo">Demo Funds</SelectItem>
                        <SelectItem value="bonus">Bonus Funds</SelectItem>
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
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this deposit..."
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={markFTDMutation.isPending}
                  data-testid="button-confirm-ftd"
                >
                  {markFTDMutation.isPending ? "Processing..." : "Mark FTD"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
