import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, UsersRound, TrendingUp, Target, DollarSign, TrendingDown, ArrowUpDown, Wallet, PiggyBank } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CRMDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  const { data: assignmentMetrics, isLoading } = useQuery({
    queryKey: ['/api/metrics/assignments'],
  });

  const { data: financialMetrics, isLoading: isLoadingFinancials } = useQuery({
    queryKey: ['/api/metrics/financials'],
  });

  const totalClients = assignmentMetrics?.totalClients || 0;
  const assignedClients = assignmentMetrics?.assignedClients || 0;
  const unassignedClients = assignmentMetrics?.unassignedClients || 0;
  const clientsWithTeam = assignmentMetrics?.clientsWithTeam || 0;

  const statCards = [
    {
      title: "Total Clients",
      value: totalClients,
      icon: Users,
      subtitle: "All clients in system",
      color: "text-primary",
    },
    {
      title: "Assigned Clients",
      value: assignedClients,
      icon: UserCheck,
      subtitle: `${totalClients > 0 ? Math.round((assignedClients / totalClients) * 100) : 0}% of total`,
      color: "text-success",
    },
    {
      title: "Unassigned Clients",
      value: unassignedClients,
      icon: UserX,
      subtitle: `${totalClients > 0 ? Math.round((unassignedClients / totalClients) * 100) : 0}% of total`,
      color: "text-destructive",
    },
    {
      title: "Clients with Teams",
      value: clientsWithTeam,
      icon: UsersRound,
      subtitle: `${totalClients > 0 ? Math.round((clientsWithTeam / totalClients) * 100) : 0}% of total`,
      color: "text-info",
    },
  ];

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: "New",
      reassigned: "Reassigned",
      potential: "Potential",
      low_potential: "Low Potential",
      mid_potential: "Mid Potential",
      high_potential: "High Potential",
      no_answer: "No Answer",
      voicemail: "Voicemail",
      callback_requested: "Callback Requested",
      not_interested: "Not Interested",
      converted: "Converted",
      lost: "Lost",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted':
        return 'text-success';
      case 'high_potential':
        return 'text-success';
      case 'mid_potential':
        return 'text-info';
      case 'low_potential':
        return 'text-warning';
      case 'lost':
      case 'not_interested':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">CRM Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Oversee teams, client assignments, and performance metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Client Status Breakdown
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignmentMetrics?.byStatus && Object.entries(assignmentMetrics.byStatus)
                .sort(([, a]: any, [, b]: any) => b - a)
                .slice(0, 8)
                .map(([status, count]: any) => {
                  const percentage = totalClients > 0
                    ? Math.round((count / totalClients) * 100) 
                    : 0;
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={getStatusColor(status)}>
                          {getStatusLabel(status)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{count}</span>
                          <span className="text-muted-foreground">({percentage}%)</span>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                }) || (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              Top Teams by Client Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignmentMetrics?.byTeam && assignmentMetrics.byTeam.length > 0 ? (
                assignmentMetrics.byTeam.slice(0, 6).map((team: any) => {
                  const percentage = totalClients > 0
                    ? Math.round((team.count / totalClients) * 100) 
                    : 0;
                  return (
                    <div key={team.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{team.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{team.count}</span>
                          <span className="text-muted-foreground">({percentage}%)</span>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No teams with clients yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Top Agents by Client Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignmentMetrics?.byAgent && assignmentMetrics.byAgent.length > 0 ? (
              assignmentMetrics.byAgent.slice(0, 9).map((agent: any) => {
                const percentage = totalClients > 0
                  ? Math.round((agent.count / totalClients) * 100) 
                  : 0;
                return (
                  <Card key={agent.id} className="hover-elevate">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {agent.name?.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.count} clients</p>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {percentage}% of total
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground col-span-3 text-center py-8">No agents with clients yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Financial Overview
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-balance">
              ${isLoadingFinancials ? '...' : (financialMetrics?.totalBalance || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Client account balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-equity">
              ${isLoadingFinancials ? '...' : (financialMetrics?.totalEquity || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Account equity values</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <PiggyBank className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success" data-testid="text-total-deposits">
              ${isLoadingFinancials ? '...' : (financialMetrics?.totalDeposits || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All-time deposits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-total-withdrawals">
              ${isLoadingFinancials ? '...' : (financialMetrics?.totalWithdrawals || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All-time withdrawals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Volume</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info" data-testid="text-trading-volume">
              ${isLoadingFinancials ? '...' : (financialMetrics?.tradingVolume || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total trade volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Deposits</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(financialMetrics?.netDeposits || 0) >= 0 ? 'text-success' : 'text-destructive'}`} data-testid="text-net-deposits">
              ${isLoadingFinancials ? '...' : (financialMetrics?.netDeposits || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Deposits - Withdrawals</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Deposit vs Withdrawal Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Total Deposits</span>
                </div>
                <span className="text-lg font-bold text-success" data-testid="text-breakdown-deposits">
                  ${isLoadingFinancials ? '...' : (financialMetrics?.totalDeposits || 0).toLocaleString()}
                </span>
              </div>
              <Progress 
                value={100} 
                className="h-3"
                data-testid="progress-deposits"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Total Withdrawals</span>
                </div>
                <span className="text-lg font-bold text-destructive" data-testid="text-breakdown-withdrawals">
                  ${isLoadingFinancials ? '...' : (financialMetrics?.totalWithdrawals || 0).toLocaleString()}
                </span>
              </div>
              <Progress 
                value={financialMetrics?.totalDeposits 
                  ? Math.round((Number(financialMetrics.totalWithdrawals) / Number(financialMetrics.totalDeposits)) * 100)
                  : 0
                } 
                className="h-3"
                data-testid="progress-withdrawals"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Net Cash Flow</span>
                </div>
                <span 
                  className={`text-xl font-bold ${(financialMetrics?.netDeposits || 0) >= 0 ? 'text-success' : 'text-destructive'}`}
                  data-testid="text-breakdown-net"
                >
                  ${isLoadingFinancials ? '...' : (financialMetrics?.netDeposits || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {financialMetrics?.totalDeposits && financialMetrics.totalWithdrawals
                  ? `${Math.round((Number(financialMetrics.totalWithdrawals) / Number(financialMetrics.totalDeposits)) * 100)}% withdrawal rate`
                  : 'No transaction data'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Top Teams by Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {financialMetrics?.byTeam && financialMetrics.byTeam.length > 0 ? (
              financialMetrics.byTeam.slice(0, 6).map((team: any) => {
                const totalBalance = financialMetrics.totalBalance || 1;
                const percentage = Math.round((team.balance / totalBalance) * 100);
                return (
                  <div key={team.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium" data-testid={`text-team-name-${team.id}`}>{team.name}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-team-clients-${team.id}`}>{team.clientCount} clients</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium" data-testid={`text-team-balance-${team.id}`}>${team.balance.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-team-percentage-${team.id}`}>({percentage}%)</p>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" data-testid={`progress-team-${team.id}`} />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No team financial data yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Top Agents by Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {financialMetrics?.byAgent && financialMetrics.byAgent.length > 0 ? (
              financialMetrics.byAgent.slice(0, 9).map((agent: any) => {
                const totalBalance = financialMetrics.totalBalance || 1;
                const percentage = Math.round((agent.balance / totalBalance) * 100);
                return (
                  <Card key={agent.id} className="hover-elevate">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {agent.name?.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-agent-name-${agent.id}`}>{agent.name}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-agent-clients-${agent.id}`}>{agent.clientCount} clients</p>
                        </div>
                      </div>
                      <div className="mb-2">
                        <p className="text-lg font-bold" data-testid={`text-agent-balance-${agent.id}`}>${agent.balance.toLocaleString()}</p>
                      </div>
                      <Progress value={percentage} className="h-2" data-testid={`progress-agent-${agent.id}`} />
                      <p className="text-xs text-muted-foreground mt-2 text-center" data-testid={`text-agent-percentage-${agent.id}`}>
                        {percentage}% of total
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground col-span-3 text-center py-8">No agent financial data yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
