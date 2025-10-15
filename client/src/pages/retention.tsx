import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, DollarSign, TrendingUp } from "lucide-react";
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

export default function RetentionClients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [filterFundType, setFilterFundType] = useState<string>('all');
  
  const { data: retentionClients, isLoading } = useQuery({
    queryKey: ['/api/clients/retention'],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
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

    if (filterFundType && filterFundType !== 'all') {
      if (client.ftdFundType !== filterFundType) return false;
    }

    return true;
  });

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
                <TableHead>FTD Amount</TableHead>
                <TableHead>Fund Type</TableHead>
                <TableHead>FTD Date</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients && clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-clients">No retention clients found</p>
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
                      <TableCell className="font-medium" data-testid={`text-ftd-amount-${client.id}`}>
                        ${parseFloat(client.ftdAmount || '0').toFixed(2)}
                      </TableCell>
                      <TableCell>{getFundTypeBadge(client.ftdFundType)}</TableCell>
                      <TableCell data-testid={`text-ftd-date-${client.id}`}>
                        {client.ftdDate ? new Date(client.ftdDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell data-testid={`text-team-${client.id}`}>{team?.name || 'Unassigned'}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/clients/${client.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-view-client-${client.id}`}
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            View Activity
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
