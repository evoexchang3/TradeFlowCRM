import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, Shield, Settings } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalVolume: number;
  activePositions: number;
  recentActivity?: Array<{
    description: string;
    timestamp: string;
    type: string;
  }>;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const statCards = [
    {
      title: t('admin.dashboard.total.users'),
      value: stats?.totalUsers || 0,
      icon: Users,
      change: t('admin.dashboard.change.users'),
      color: "text-primary",
    },
    {
      title: t('admin.dashboard.total.clients'),
      value: stats?.totalClients || 0,
      icon: Shield,
      change: t('admin.dashboard.change.clients'),
      color: "text-success",
    },
    {
      title: t('admin.dashboard.system.revenue'),
      value: `$${(stats?.totalVolume || 0).toLocaleString()}`,
      icon: DollarSign,
      change: t('admin.dashboard.change.revenue'),
      color: "text-info",
    },
    {
      title: t('admin.dashboard.active.positions'),
      value: stats?.activePositions || 0,
      icon: TrendingUp,
      change: t('admin.dashboard.change.positions'),
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">{t('admin.dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('admin.dashboard.subtitle')}
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
            <CardTitle>{t('admin.dashboard.system.activity')}</CardTitle>
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
                <p className="text-sm text-muted-foreground">{t('dashboard.no.recent.activity')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.system.health')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('admin.dashboard.api.status')}</span>
                </div>
                <span className="text-sm font-medium text-success">{t('admin.dashboard.status.operational')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('admin.dashboard.trading.engine')}</span>
                </div>
                <span className="text-sm font-medium text-success">{t('admin.dashboard.status.active')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('admin.dashboard.market.data')}</span>
                </div>
                <span className="text-sm font-medium text-success">{t('admin.dashboard.status.connected')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
