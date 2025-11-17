import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, TrendingUp, Phone, MessageSquare, Target, DollarSign, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface PerformanceMetrics {
  agentId: string;
  agentName: string;
  teamId?: string;
  teamName?: string;
  department?: string;
  
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number;
  totalFtdVolume: number;
  avgFtdAmount: number;
  
  totalCalls: number;
  totalCallDuration: number;
  avgCallDuration: number;
  totalComments: number;
  totalLogins: number;
  
  avgResponseTime: number;
  performanceScore: number;
}

export default function AgentDashboard() {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: metrics, isLoading } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/dashboard/my-performance', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/dashboard/my-performance${query}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch performance metrics');
      return response.json();
    },
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">
          {t('agent.dashboard.no.data')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-agent-dashboard">
            {t('agent.dashboard.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {metrics.teamName && <span className="text-sm">{t('agent.dashboard.team.label')} {metrics.teamName}</span>}
            {metrics.department && <Badge variant="outline" className="ml-2 capitalize">{metrics.department}</Badge>}
          </p>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          {(startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearDateFilters}
              data-testid="button-clear-dates"
            >
              {t('agent.dashboard.clear.dates')}
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-start-date">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PP') : t('agent.dashboard.start.date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-end-date">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PP') : t('agent.dashboard.end.date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Performance Score Card */}
      <Card data-testid="card-performance-score">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('agent.dashboard.performance.score')}
          </CardTitle>
          <CardDescription>
            {t('agent.dashboard.performance.score.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-5xl font-bold ${getPerformanceColor(metrics.performanceScore)}`} data-testid="text-performance-score">
            {metrics.performanceScore}
            <span className="text-2xl text-muted-foreground">{t('agent.dashboard.performance.score.outof')}</span>
          </div>
        </CardContent>
      </Card>

      {/* FTD Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('agent.dashboard.ftd.performance')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-clients">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('agent.dashboard.total.clients')}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-clients">{metrics.totalClients}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-ftd-count">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('agent.dashboard.ftd.count')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-ftd-count">{metrics.ftdCount}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-conversion-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('agent.dashboard.conversion.rate')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-conversion-rate">{metrics.ftdConversionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card data-testid="card-ftd-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('agent.dashboard.total.ftd.volume')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-ftd-volume">
                ${metrics.totalFtdVolume.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('agent.dashboard.avg.label')} ${metrics.avgFtdAmount.toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('agent.dashboard.activity.metrics')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-calls">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('agent.dashboard.total.calls')}</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-calls">{metrics.totalCalls}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('agent.dashboard.avg.duration')} {formatDuration(metrics.avgCallDuration)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-call-duration">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('agent.dashboard.total.call.time')}</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-call-duration">
                {formatDuration(metrics.totalCallDuration)}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-comments">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('agent.dashboard.comments.added')}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-comments">{metrics.totalComments}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-response-time">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('agent.dashboard.avg.response.time')}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-response-time">
                {formatDuration(metrics.avgResponseTime)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('agent.dashboard.first.contact.time')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
