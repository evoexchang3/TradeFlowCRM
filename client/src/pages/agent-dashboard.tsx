import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, TrendingUp, CheckCircle } from "lucide-react";

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const statCards = [
    {
      title: "My Clients",
      value: stats?.myClients || 0,
      icon: Users,
      change: "+4 new this week",
      color: "text-primary",
    },
    {
      title: "Open Tasks",
      value: stats?.openTasks || 0,
      icon: ClipboardList,
      change: "3 due today",
      color: "text-warning",
    },
    {
      title: "Client Trades",
      value: stats?.clientTrades || 0,
      icon: TrendingUp,
      change: "+12% from last week",
      color: "text-success",
    },
    {
      title: "Completed Today",
      value: stats?.completedToday || 0,
      icon: CheckCircle,
      change: "6 tasks remaining",
      color: "text-info",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Agent Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage your assigned clients and daily tasks
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
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Client Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentActivity?.map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs ${
                    activity.type === 'trade' ? 'bg-success/10 text-success' :
                    activity.type === 'deposit' ? 'bg-info/10 text-info' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {activity.type}
                  </span>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topPerformers?.map((performer: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {performer.name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{performer.name}</p>
                      <p className="text-xs text-muted-foreground">{performer.trades} trades</p>
                    </div>
                  </div>
                  <span className={`text-sm font-mono font-medium ${
                    performer.pnl >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {performer.pnl >= 0 ? '+' : ''}{performer.pnl}%
                  </span>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
