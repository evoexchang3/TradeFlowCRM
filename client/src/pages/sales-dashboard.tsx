import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, DollarSign, TrendingUp, Target, RefreshCcw } from "lucide-react";
import { LineChart, Line, BarChart, Bar, FunnelChart, Funnel, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { format, subDays } from "date-fns";

export default function SalesDashboard() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [teamFilter, setTeamFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const { data: metrics, isLoading, refetch } = useQuery<any>({
    queryKey: ['/api/reports/sales-dashboard', startDate, endDate, teamFilter, agentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (teamFilter !== 'all') params.append('teamId', teamFilter);
      if (agentFilter !== 'all') params.append('agentId', agentFilter);
      
      const response = await fetch(`/api/reports/sales-dashboard?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }
      
      return response.json();
    },
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Sales Dashboard</h1>
          <p className="text-muted-foreground">
            Sales performance metrics and analytics
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div>
              <Label htmlFor="teamFilter">Team</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger id="teamFilter" data-testid="select-team-filter">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="agentFilter">Agent</Label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger id="agentFilter" data-testid="select-agent-filter">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {users.filter(u => u.type === 'user').map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-clients">{metrics?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.salesClients || 0} in sales, {metrics?.retentionClients || 0} in retention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversion-rate">{metrics?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              FTD conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FTD Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ftd-value">${metrics?.totalFTDAmount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${metrics?.avgFTDAmount || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FTDs in Period</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-recent-ftds">{metrics?.recentFTDsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>FTD Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics?.timeSeries || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), "MMM d")} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip labelFormatter={(value) => format(new Date(value), "MMM d, yyyy")} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="ftdCount" stroke="#8884d8" name="FTD Count" />
              <Line yAxisId="right" type="monotone" dataKey="ftdAmount" stroke="#82ca9d" name="FTD Amount ($)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics?.conversionFunnel || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8">
                  <LabelList dataKey="count" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.pipelineDistribution && Object.entries(metrics.pipelineDistribution).map(([status, count]: any) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-32 text-sm font-medium capitalize">{status.replace(/_/g, ' ')}</div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden" style={{ minWidth: '200px' }}>
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(count / metrics.totalClients) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold ml-4" data-testid={`text-pipeline-${status}`}>{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Total Clients</TableHead>
                <TableHead className="text-right">FTD Count</TableHead>
                <TableHead className="text-right">FTD Amount</TableHead>
                <TableHead className="text-right">Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.agentPerformance && metrics.agentPerformance.length > 0 ? (
                metrics.agentPerformance.map((agent: any) => (
                  <TableRow key={agent.agentId} data-testid={`row-agent-${agent.agentId}`}>
                    <TableCell className="font-medium">{agent.agentName}</TableCell>
                    <TableCell className="text-right">{agent.totalClients}</TableCell>
                    <TableCell className="text-right">{agent.ftdCount}</TableCell>
                    <TableCell className="text-right">${agent.ftdAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{agent.conversionRate}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No agent performance data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sales vs Retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sales Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2" data-testid="text-sales-clients">{metrics?.salesClients || 0}</div>
            <p className="text-sm text-muted-foreground">
              {metrics?.totalClients > 0 
                ? ((metrics.salesClients / metrics.totalClients) * 100).toFixed(1) 
                : 0}% of total clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retention Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2" data-testid="text-retention-clients">{metrics?.retentionClients || 0}</div>
            <p className="text-sm text-muted-foreground">
              {metrics?.totalClients > 0 
                ? ((metrics.retentionClients / metrics.totalClients) * 100).toFixed(1) 
                : 0}% of total clients
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
