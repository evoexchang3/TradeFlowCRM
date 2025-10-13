import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, Shield, Settings } from "lucide-react";

export default function AdminDashboard() {
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
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      change: "+8% from last month",
      color: "text-primary",
    },
    {
      title: "Total Clients",
      value: stats?.totalClients || 0,
      icon: Shield,
      change: "+12% from last month",
      color: "text-success",
    },
    {
      title: "System Revenue",
      value: `$${(stats?.totalVolume || 0).toLocaleString()}`,
      icon: DollarSign,
      change: "+18% from last month",
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
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Administrator Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Full system overview and management controls
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
            <CardTitle>System Activity</CardTitle>
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
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">API Status</span>
                </div>
                <span className="text-sm font-medium text-success">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Trading Engine</span>
                </div>
                <span className="text-sm font-medium text-success">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Market Data</span>
                </div>
                <span className="text-sm font-medium text-success">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
