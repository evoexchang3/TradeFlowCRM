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
import { Users, DollarSign, TrendingUp, Repeat, RefreshCcw } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { format, subDays } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RetentionDashboard() {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [teamFilter, setTeamFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const { data: metrics, isLoading, refetch } = useQuery<any>({
    queryKey: ['/api/reports/retention-dashboard', startDate, endDate, teamFilter, agentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (teamFilter !== 'all') params.append('teamId', teamFilter);
      if (agentFilter !== 'all') params.append('agentId', agentFilter);
      
      const response = await fetch(`/api/reports/retention-dashboard?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch retention metrics');
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
          <p className="text-muted-foreground">{t('retentionDashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('retentionDashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('retentionDashboard.subtitle')}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh">
          <RefreshCcw className="h-4 w-4 mr-2" />
          {t('retentionDashboard.refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('retentionDashboard.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">{t('retentionDashboard.startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label htmlFor="endDate">{t('retentionDashboard.endDate')}</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div>
              <Label htmlFor="teamFilter">{t('retentionDashboard.team')}</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger id="teamFilter" data-testid="select-team-filter">
                  <SelectValue placeholder={t('retentionDashboard.allTeams')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('retentionDashboard.allTeams')}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="agentFilter">{t('retentionDashboard.agent')}</Label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger id="agentFilter" data-testid="select-agent-filter">
                  <SelectValue placeholder={t('retentionDashboard.allAgents')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('retentionDashboard.allAgents')}</SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('retentionDashboard.retentionClients')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-retention-clients">{metrics?.totalRetentionClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('retentionDashboard.clientsWithFtd')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('retentionDashboard.stdConversionRate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-std-conversion">{metrics?.stdConversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {t('retentionDashboard.ftdStdConversion')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('retentionDashboard.totalStdValue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-std-value">${metrics?.totalSTDAmount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('retentionDashboard.avg', { amount: metrics?.avgSTDAmount || 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('retentionDashboard.stdsInPeriod')}</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-recent-stds">{metrics?.recentSTDsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('retentionDashboard.stdTrendsOverTime')}</CardTitle>
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
              <Line yAxisId="left" type="monotone" dataKey="stdCount" stroke="#8884d8" name={t('retentionDashboard.stdCount')} />
              <Line yAxisId="right" type="monotone" dataKey="stdAmount" stroke="#82ca9d" name={t('retentionDashboard.stdAmountDollar')} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('retentionDashboard.retentionFunnel')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics?.retentionFunnel || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8">
                <LabelList dataKey="count" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('retentionDashboard.agentRetentionPerformance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('retentionDashboard.table.agent')}</TableHead>
                <TableHead className="text-right">{t('retentionDashboard.table.retentionClients')}</TableHead>
                <TableHead className="text-right">{t('retentionDashboard.table.stdCount')}</TableHead>
                <TableHead className="text-right">{t('retentionDashboard.table.stdAmount')}</TableHead>
                <TableHead className="text-right">{t('retentionDashboard.table.stdConversion')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.agentPerformance && metrics.agentPerformance.length > 0 ? (
                metrics.agentPerformance.map((agent: any) => (
                  <TableRow key={agent.agentId} data-testid={`row-agent-${agent.agentId}`}>
                    <TableCell className="font-medium">{agent.agentName}</TableCell>
                    <TableCell className="text-right">{agent.totalRetentionClients}</TableCell>
                    <TableCell className="text-right">{agent.stdCount}</TableCell>
                    <TableCell className="text-right">${agent.stdAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{agent.stdConversionRate}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('retentionDashboard.noAgentPerformanceData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('retentionDashboard.stdClients')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2" data-testid="text-std-clients">{metrics?.stdClients || 0}</div>
            <p className="text-sm text-muted-foreground">
              {t('retentionDashboard.clientsMade2PlusDeposits')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('retentionDashboard.pendingStd')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2" data-testid="text-pending-std">
              {(metrics?.totalRetentionClients || 0) - (metrics?.stdClients || 0)}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('retentionDashboard.retentionClientsNoStd')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
