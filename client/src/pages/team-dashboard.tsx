import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Target, TrendingUp } from "lucide-react";

export default function TeamDashboard() {
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
      title: "My Team Members",
      value: stats?.teamMembers || 0,
      icon: Users,
      change: "+2 members this month",
      color: "text-primary",
    },
    {
      title: "Assigned Clients",
      value: stats?.assignedClients || 0,
      icon: UserCheck,
      change: "+8 new clients",
      color: "text-success",
    },
    {
      title: "Team Performance",
      value: `${stats?.teamPerformance || 0}%`,
      icon: Target,
      change: "+15% this month",
      color: "text-info",
    },
    {
      title: "Active Positions",
      value: stats?.activePositions || 0,
      icon: TrendingUp,
      change: "+5% from last week",
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Team Leader Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage your team and monitor client performance
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
            <CardTitle>Team Activity</CardTitle>
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
            <CardTitle>Top Team Performers</CardTitle>
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
