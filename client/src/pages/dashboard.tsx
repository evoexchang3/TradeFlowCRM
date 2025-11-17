import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  // Fetch user data to determine their role
  const { data: userData } = useQuery({
    queryKey: ['/api/me'],
    enabled: isAuthenticated,
  });

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  // Redirect to role-specific dashboard
  useEffect(() => {
    if (userData?.user?.role?.name) {
      const roleName = userData.user.role.name.toLowerCase();
      
      if (roleName === 'administrator') {
        setLocation('/admin');
      } else if (roleName === 'crm manager') {
        setLocation('/crm');
      } else if (roleName === 'sales team leader' || roleName === 'retention team leader') {
        setLocation('/team');
      } else if (roleName === 'sales agent' || roleName === 'retention agent') {
        setLocation('/agent');
      }
      // If no match, stay on generic dashboard
    }
  }, [userData, setLocation]);

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const statCards = [
    {
      title: t('dashboard.total.clients'),
      value: stats?.totalClients || 0,
      icon: Users,
      change: t('dashboard.change.from.last.month'),
      color: "text-primary",
    },
    {
      title: t('dashboard.active.positions'),
      value: stats?.activePositions || 0,
      icon: TrendingUp,
      change: t('dashboard.change.from.last.week'),
      color: "text-success",
    },
    {
      title: t('dashboard.total.volume'),
      value: `$${(stats?.totalVolume || 0).toLocaleString()}`,
      icon: DollarSign,
      change: t('dashboard.change.from.last.month'),
      color: "text-info",
    },
    {
      title: t('dashboard.active.trades'),
      value: stats?.activeTrades || 0,
      icon: Activity,
      change: t('dashboard.change.from.yesterday'),
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('dashboard.subtitle')}
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
            <CardTitle>{t('dashboard.recent.activity')}</CardTitle>
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
            <CardTitle>{t('dashboard.top.performers')}</CardTitle>
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
                      <p className="text-xs text-muted-foreground">{performer.trades} {t('dashboard.trades')}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-mono font-medium ${
                    performer.pnl >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {performer.pnl >= 0 ? '+' : ''}{performer.pnl}%
                  </span>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground">{t('dashboard.no.data.available')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
